#!/usr/bin/env bash
# Runs the browser tests against a local copy of index.html in a headless playwright-cli session.
#
#   test/run.sh                         # every test/*.test.js
#   test/run.sh test/share-button.test.js
#
# Needs playwright-cli, python3 and node on PATH, plus network access to the CDNs the page loads.
# JSPAD_TEST_PORT (default 5601) and JSPAD_TEST_SESSION (default jspad-test) override the defaults;
# pointing JSPAD_TEST_SESSION at an already-open session reuses it and leaves it open.
# JSPAD_TEST_URL runs the tests against a deployed copy instead of starting the local server, e.g.
#   JSPAD_TEST_URL=https://sourav9063.github.io/jspad/ test/run.sh
set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
# playwright-cli sessions are scoped to the working directory.
cd "$root" || exit 1
port="${JSPAD_TEST_PORT:-5601}"
session="${JSPAD_TEST_SESSION:-jspad-test}"
base_url="${JSPAD_TEST_URL:-http://127.0.0.1:${port}/index.html}"
work_dir="$(mktemp -d)"
server_pid=""
opened_session=false

cleanup() {
  [[ -n "$server_pid" ]] && { kill "$server_pid"; wait "$server_pid"; } 2>/dev/null
  $opened_session && playwright-cli -s="$session" close >/dev/null 2>&1
  rm -rf "$work_dir"
}
trap cleanup EXIT

start_server() {
  # A plain static server: live-reload servers reload the page when playwright-cli writes its logs.
  python3 -m http.server "$port" --bind 127.0.0.1 --directory "$root" >"$work_dir/server.log" 2>&1 &
  server_pid=$!
  for _ in {1..50}; do
    curl -sf -o /dev/null "$base_url" && break
    sleep 0.1
  done
  if ! curl -sf -o /dev/null "$base_url"; then
    echo "Couldn't start the test server on port $port:" >&2
    cat "$work_dir/server.log" >&2
    exit 1
  fi
}
if [[ -z "${JSPAD_TEST_URL:-}" ]]; then start_server; fi

if ! playwright-cli -s="$session" --raw eval "1" >/dev/null 2>&1; then
  playwright-cli -s="$session" open >/dev/null || { echo "Couldn't open a playwright-cli session" >&2; exit 1; }
  opened_session=true
fi

if (( $# > 0 )); then tests=("$@"); else tests=("$root"/test/*.test.js); fi

failed=0
for test_file in "${tests[@]}"; do
  name="$(basename "$test_file" .test.js)"
  script="$work_dir/$name.js"
  {
    echo "async (page) => {"
    echo "  const failures = [];"
    echo "  const makeHelpers = $(cat "$root/test/helpers.js");"
    echo "  const t = makeHelpers(page, { baseUrl: \"$base_url\", failures });"
    echo "  const run = $(cat "$test_file");"
    echo "  try { await run(page, t); } catch (error) { failures.push(\`threw: \${error.message.split(\"\\n\")[0]}\`); }"
    echo "  return JSON.stringify({ failures });"
    echo "}"
  } >"$script"

  output="$(playwright-cli -s="$session" --raw run-code --filename="$script" 2>&1)"
  report="$(node -e '
    let value = process.argv[1];
    try { while (typeof value === "string") value = JSON.parse(value); } catch { process.exit(2); }
    if (!Array.isArray(value?.failures)) process.exit(2);
    for (const failure of value.failures) console.log("    " + failure);
    process.exit(value.failures.length ? 1 : 0);
  ' "$output")"
  case $? in
    0) echo "PASS $name" ;;
    1) echo "FAIL $name"; echo "$report"; failed=1 ;;
    *) echo "FAIL $name (no result)"; echo "$output" | sed 's/^/    /'; failed=1 ;;
  esac
done
exit "$failed"
