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
    const compressed = (bytes, version = 2) => `${version}.` + bytesToBase64Url(brotli.compress(bytes, { quality: 11 }));
    const compressedText = (text, version) => compressed(new TextEncoder().encode(text), version);
    const legacyText = (value) => compressedText(JSON.stringify(value), 1);

    const legacyRoundTrips = {};
    for (const mode of SHARE_MODES) {
      const code = "// héllo \"quoted\"\nconsole.log('✓')";
      const decoded = await decodeShareHash(legacyText({ mode, code }));
      legacyRoundTrips[ mode ] = decoded.code === code && decoded.mode === mode;
    }
    const goodCode = "console.log('a longer text so the link has some length')";
    const good = await encodeShareHash({ mode: "js", code: goodCode });
    const payload = new TextDecoder().decode(decompressBounded(brotli, base64UrlToBytes(good.slice(2))));

    await reject("truncated", good.slice(0, -5));
    await reject("truncatedByOne", good.slice(0, -1));
    await reject("notBase64", "2.!!!notbase64");
    await reject("notBrotli", "2.QUJDREVGRw");
    await reject("noVersion", good.slice(2));
    await reject("versionZero", "0." + good.slice(2));
    await reject("unknownVersion", "3." + good.slice(2));
    await reject("overLong", "2." + "A".repeat(MAX_SHARE_HASH_LENGTH));
    await reject("trailingInput", good + "AAAA");
    await reject("invalidUtf8", compressed(new Uint8Array([ 0xff, 0xfe, 0x80 ])));
    await reject("emptyPayload", compressedText(""));
    await reject("unknownMode", compressedText("pprint(1)"));
    await reject("v2PayloadAsV1", compressedText("j" + goodCode, 1));
    await reject("v1NotJson", compressedText("hello", 1));
    await reject("v1NullJson", compressedText("null", 1));
    await reject("v1CodeNotString", legacyText({ mode: "js", code: 42 }));
    await reject("v1UnknownMode", legacyText({ mode: "py", code: "x" }));
    await reject("decompressionBomb", compressed(new Uint8Array(DECOMPRESSION_BOMB_BYTES)));

    let tamperedAsset;
    try {
      await fetchVerified({ ...VERIFIED_ASSETS.brotliWasm, sha256: "0".repeat(64) });
      tamperedAsset = "accepted";
    } catch (error) {
      tamperedAsset = error.message.includes("integrity check");
    }
    return { roundTrips, legacyRoundTrips, rejections, tamperedAsset, payload, expectedPayload: "j" + goodCode };
  });

  for (const [ label, passed ] of Object.entries(result.roundTrips)) t.expect(`round trip ${label}`, passed, true);
  for (const [ mode, passed ] of Object.entries(result.legacyRoundTrips)) t.expect(`v1 link decodes ${mode}`, passed, true);
  const damaged = "ShareLinkError:damaged";
  t.expect("rejections", result.rejections, {
    truncated: damaged,
    truncatedByOne: damaged,
    notBase64: damaged,
    notBrotli: damaged,
    noVersion: damaged,
    versionZero: damaged,
    unknownVersion: "ShareLinkError:unsupported-version",
    overLong: "ShareLinkError:too-large",
    trailingInput: damaged,
    invalidUtf8: damaged,
    emptyPayload: damaged,
    unknownMode: damaged,
    v2PayloadAsV1: damaged,
    v1NotJson: damaged,
    v1NullJson: damaged,
    v1CodeNotString: damaged,
    v1UnknownMode: damaged,
    decompressionBomb: "ShareLinkError:too-large",
  });
  t.expect("payload is the mode tag followed by the raw code", result.payload, result.expectedPayload);
  t.expect("asset with a wrong digest is refused", result.tamperedAsset, true);
}
