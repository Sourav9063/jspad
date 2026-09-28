// Encoding and decoding of the URL hash, including hostile input.
async (page, t) => {
  await t.reset();
  await t.open();

  const result = await page.evaluate(async () => {
    const DECOMPRESSION_BOMB_BYTES = 50 * 1024 * 1024;
    const roundTrips = {};
    const bigCode = Array.from({ length: 2000 }, (_, i) => `const v${i} = "${"x".repeat(i % 20)}"; // ${i}`).join("\n");
    const samples = { ascii: "console.log(1)", unicode: "// héllo 😀 中文 \u0000\nconsole.log('✓')", empty: "", big: bigCode, crlf: "a\r\nb" };
    for (const [ name, code ] of Object.entries(samples)) {
      for (const mode of SHARE_MODES) {
        const decoded = await decodeShareHash(await encodeShareHash({ mode, code }));
        roundTrips[ `${name}/${mode}` ] = decoded.code === code && decoded.mode === mode;
      }
    }

    const rejections = {};
    const reject = async (label, hash) => {
      try {
        await decodeShareHash(hash);
        rejections[ label ] = "accepted";
      } catch (error) {
        rejections[ label ] = `${error.name}:${error.code}`;
      }
    };
    const brotli = await loadBrotli();
    const compressed = (bytes) => "1." + bytesToBase64Url(brotli.compress(bytes, { quality: 11 }));
    const compressedText = (text) => compressed(new TextEncoder().encode(text));
    const good = await encodeShareHash({ mode: "js", code: "console.log('a longer text so the link has some length')" });

    await reject("truncated", good.slice(0, -5));
    await reject("truncatedByOne", good.slice(0, -1));
    await reject("notBase64", "1.!!!notbase64");
    await reject("notBrotli", "1.QUJDREVGRw");
    await reject("noVersion", good.slice(2));
    await reject("unknownVersion", "2." + good.slice(2));
    await reject("overLong", "1." + "A".repeat(MAX_SHARE_HASH_LENGTH));
    await reject("trailingInput", good + "AAAA");
    await reject("invalidUtf8", compressed(new Uint8Array([ 0xff, 0xfe, 0x80 ])));
    await reject("notJson", compressedText("hello"));
    await reject("nullJson", compressedText("null"));
    await reject("codeNotString", compressedText(JSON.stringify({ mode: "js", code: 42 })));
    await reject("unknownMode", compressedText(JSON.stringify({ mode: "py", code: "x" })));
    await reject("decompressionBomb", compressed(new Uint8Array(DECOMPRESSION_BOMB_BYTES)));

    let tamperedAsset;
    try {
      await fetchVerified({ ...VERIFIED_ASSETS.brotliWasm, sha256: "0".repeat(64) });
      tamperedAsset = "accepted";
    } catch (error) {
      tamperedAsset = error.message.includes("integrity check");
    }
    return { roundTrips, rejections, tamperedAsset };
  });

  for (const [ label, passed ] of Object.entries(result.roundTrips)) t.expect(`round trip ${label}`, passed, true);
  const damaged = "ShareLinkError:damaged";
  t.expect("rejections", result.rejections, {
    truncated: damaged,
    truncatedByOne: damaged,
    notBase64: damaged,
    notBrotli: damaged,
    noVersion: damaged,
    unknownVersion: "ShareLinkError:unsupported-version",
    overLong: "ShareLinkError:too-large",
    trailingInput: damaged,
    invalidUtf8: damaged,
    notJson: damaged,
    nullJson: damaged,
    codeNotString: damaged,
    unknownMode: damaged,
    decompressionBomb: "ShareLinkError:too-large",
  });
  t.expect("asset with a wrong digest is refused", result.tamperedAsset, true);
}
