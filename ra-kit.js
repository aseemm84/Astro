"use strict";
var Mp4Muxer = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet(obj, member, value, setter);
    },
    get _() {
      return __privateGet(obj, member, getter);
    }
  });
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    ArrayBufferTarget: () => ArrayBufferTarget,
    FileSystemWritableFileStreamTarget: () => FileSystemWritableFileStreamTarget,
    Muxer: () => Muxer,
    StreamTarget: () => StreamTarget
  });

  // src/misc.ts
  var bytes = new Uint8Array(8);
  var view = new DataView(bytes.buffer);
  var u8 = (value) => {
    return [(value % 256 + 256) % 256];
  };
  var u16 = (value) => {
    view.setUint16(0, value, false);
    return [bytes[0], bytes[1]];
  };
  var i16 = (value) => {
    view.setInt16(0, value, false);
    return [bytes[0], bytes[1]];
  };
  var u24 = (value) => {
    view.setUint32(0, value, false);
    return [bytes[1], bytes[2], bytes[3]];
  };
  var u32 = (value) => {
    view.setUint32(0, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var i32 = (value) => {
    view.setInt32(0, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var u64 = (value) => {
    view.setUint32(0, Math.floor(value / 2 ** 32), false);
    view.setUint32(4, value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], bytes[6], bytes[7]];
  };
  var fixed_8_8 = (value) => {
    view.setInt16(0, 2 ** 8 * value, false);
    return [bytes[0], bytes[1]];
  };
  var fixed_16_16 = (value) => {
    view.setInt32(0, 2 ** 16 * value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var fixed_2_30 = (value) => {
    view.setInt32(0, 2 ** 30 * value, false);
    return [bytes[0], bytes[1], bytes[2], bytes[3]];
  };
  var ascii = (text, nullTerminated = false) => {
    let bytes2 = Array(text.length).fill(null).map((_, i) => text.charCodeAt(i));
    if (nullTerminated)
      bytes2.push(0);
    return bytes2;
  };
  var last = (arr) => {
    return arr && arr[arr.length - 1];
  };
  var lastPresentedSample = (samples) => {
    let result = void 0;
    for (let sample of samples) {
      if (!result || sample.presentationTimestamp > result.presentationTimestamp) {
        result = sample;
      }
    }
    return result;
  };
  var intoTimescale = (timeInSeconds, timescale, round = true) => {
    let value = timeInSeconds * timescale;
    return round ? Math.round(value) : value;
  };
  var rotationMatrix = (rotationInDegrees) => {
    let theta = rotationInDegrees * (Math.PI / 180);
    let cosTheta = Math.cos(theta);
    let sinTheta = Math.sin(theta);
    return [
      cosTheta,
      sinTheta,
      0,
      -sinTheta,
      cosTheta,
      0,
      0,
      0,
      1
    ];
  };
  var IDENTITY_MATRIX = rotationMatrix(0);
  var matrixToBytes = (matrix) => {
    return [
      fixed_16_16(matrix[0]),
      fixed_16_16(matrix[1]),
      fixed_2_30(matrix[2]),
      fixed_16_16(matrix[3]),
      fixed_16_16(matrix[4]),
      fixed_2_30(matrix[5]),
      fixed_16_16(matrix[6]),
      fixed_16_16(matrix[7]),
      fixed_2_30(matrix[8])
    ];
  };
  var deepClone = (x) => {
    if (!x)
      return x;
    if (typeof x !== "object")
      return x;
    if (Array.isArray(x))
      return x.map(deepClone);
    return Object.fromEntries(Object.entries(x).map(([key, value]) => [key, deepClone(value)]));
  };
  var isU32 = (value) => {
    return value >= 0 && value < 2 ** 32;
  };

  // src/box.ts
  var box = (type, contents, children) => ({
    type,
    contents: contents && new Uint8Array(contents.flat(10)),
    children
  });
  var fullBox = (type, version, flags, contents, children) => box(
    type,
    [u8(version), u24(flags), contents ?? []],
    children
  );
  var ftyp = (details) => {
    let minorVersion = 512;
    if (details.fragmented)
      return box("ftyp", [
        ascii("iso5"),
        // Major brand
        u32(minorVersion),
        // Minor version
        // Compatible brands
        ascii("iso5"),
        ascii("iso6"),
        ascii("mp41")
      ]);
    return box("ftyp", [
      ascii("isom"),
      // Major brand
      u32(minorVersion),
      // Minor version
      // Compatible brands
      ascii("isom"),
      details.holdsAvc ? ascii("avc1") : [],
      ascii("mp41")
    ]);
  };
  var mdat = (reserveLargeSize) => ({ type: "mdat", largeSize: reserveLargeSize });
  var free = (size) => ({ type: "free", size });
  var moov = (tracks, creationTime, fragmented = false) => box("moov", null, [
    mvhd(creationTime, tracks),
    ...tracks.map((x) => trak(x, creationTime)),
    fragmented ? mvex(tracks) : null
  ]);
  var mvhd = (creationTime, tracks) => {
    let duration = intoTimescale(Math.max(
      0,
      ...tracks.filter((x) => x.samples.length > 0).map((x) => {
        const lastSample = lastPresentedSample(x.samples);
        return lastSample.presentationTimestamp + lastSample.duration;
      })
    ), GLOBAL_TIMESCALE);
    let nextTrackId = Math.max(...tracks.map((x) => x.id)) + 1;
    let needsU64 = !isU32(creationTime) || !isU32(duration);
    let u32OrU64 = needsU64 ? u64 : u32;
    return fullBox("mvhd", +needsU64, 0, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(GLOBAL_TIMESCALE),
      // Timescale
      u32OrU64(duration),
      // Duration
      fixed_16_16(1),
      // Preferred rate
      fixed_8_8(1),
      // Preferred volume
      Array(10).fill(0),
      // Reserved
      matrixToBytes(IDENTITY_MATRIX),
      // Matrix
      Array(24).fill(0),
      // Pre-defined
      u32(nextTrackId)
      // Next track ID
    ]);
  };
  var trak = (track, creationTime) => box("trak", null, [
    tkhd(track, creationTime),
    mdia(track, creationTime)
  ]);
  var tkhd = (track, creationTime) => {
    let lastSample = lastPresentedSample(track.samples);
    let durationInGlobalTimescale = intoTimescale(
      lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
      GLOBAL_TIMESCALE
    );
    let needsU64 = !isU32(creationTime) || !isU32(durationInGlobalTimescale);
    let u32OrU64 = needsU64 ? u64 : u32;
    let matrix;
    if (track.info.type === "video") {
      matrix = typeof track.info.rotation === "number" ? rotationMatrix(track.info.rotation) : track.info.rotation;
    } else {
      matrix = IDENTITY_MATRIX;
    }
    return fullBox("tkhd", +needsU64, 3, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(track.id),
      // Track ID
      u32(0),
      // Reserved
      u32OrU64(durationInGlobalTimescale),
      // Duration
      Array(8).fill(0),
      // Reserved
      u16(0),
      // Layer
      u16(0),
      // Alternate group
      fixed_8_8(track.info.type === "audio" ? 1 : 0),
      // Volume
      u16(0),
      // Reserved
      matrixToBytes(matrix),
      // Matrix
      fixed_16_16(track.info.type === "video" ? track.info.width : 0),
      // Track width
      fixed_16_16(track.info.type === "video" ? track.info.height : 0)
      // Track height
    ]);
  };
  var mdia = (track, creationTime) => box("mdia", null, [
    mdhd(track, creationTime),
    hdlr(track.info.type === "video" ? "vide" : "soun"),
    minf(track)
  ]);
  var mdhd = (track, creationTime) => {
    let lastSample = lastPresentedSample(track.samples);
    let localDuration = intoTimescale(
      lastSample ? lastSample.presentationTimestamp + lastSample.duration : 0,
      track.timescale
    );
    let needsU64 = !isU32(creationTime) || !isU32(localDuration);
    let u32OrU64 = needsU64 ? u64 : u32;
    return fullBox("mdhd", +needsU64, 0, [
      u32OrU64(creationTime),
      // Creation time
      u32OrU64(creationTime),
      // Modification time
      u32(track.timescale),
      // Timescale
      u32OrU64(localDuration),
      // Duration
      u16(21956),
      // Language ("und", undetermined)
      u16(0)
      // Quality
    ]);
  };
  var hdlr = (componentSubtype) => fullBox("hdlr", 0, 0, [
    ascii("mhlr"),
    // Component type
    ascii(componentSubtype),
    // Component subtype
    u32(0),
    // Component manufacturer
    u32(0),
    // Component flags
    u32(0),
    // Component flags mask
    ascii("mp4-muxer-hdlr", true)
    // Component name
  ]);
  var minf = (track) => box("minf", null, [
    track.info.type === "video" ? vmhd() : smhd(),
    dinf(),
    stbl(track)
  ]);
  var vmhd = () => fullBox("vmhd", 0, 1, [
    u16(0),
    // Graphics mode
    u16(0),
    // Opcolor R
    u16(0),
    // Opcolor G
    u16(0)
    // Opcolor B
  ]);
  var smhd = () => fullBox("smhd", 0, 0, [
    u16(0),
    // Balance
    u16(0)
    // Reserved
  ]);
  var dinf = () => box("dinf", null, [
    dref()
  ]);
  var dref = () => fullBox("dref", 0, 0, [
    u32(1)
    // Entry count
  ], [
    url()
  ]);
  var url = () => fullBox("url ", 0, 1);
  var stbl = (track) => {
    const needsCtts = track.compositionTimeOffsetTable.length > 1 || track.compositionTimeOffsetTable.some((x) => x.sampleCompositionTimeOffset !== 0);
    return box("stbl", null, [
      stsd(track),
      stts(track),
      stss(track),
      stsc(track),
      stsz(track),
      stco(track),
      needsCtts ? ctts(track) : null
    ]);
  };
  var stsd = (track) => fullBox("stsd", 0, 0, [
    u32(1)
    // Entry count
  ], [
    track.info.type === "video" ? videoSampleDescription(
      VIDEO_CODEC_TO_BOX_NAME[track.info.codec],
      track
    ) : soundSampleDescription(
      AUDIO_CODEC_TO_BOX_NAME[track.info.codec],
      track
    )
  ]);
  var videoSampleDescription = (compressionType, track) => box(compressionType, [
    Array(6).fill(0),
    // Reserved
    u16(1),
    // Data reference index
    u16(0),
    // Pre-defined
    u16(0),
    // Reserved
    Array(12).fill(0),
    // Pre-defined
    u16(track.info.width),
    // Width
    u16(track.info.height),
    // Height
    u32(4718592),
    // Horizontal resolution
    u32(4718592),
    // Vertical resolution
    u32(0),
    // Reserved
    u16(1),
    // Frame count
    Array(32).fill(0),
    // Compressor name
    u16(24),
    // Depth
    i16(65535)
    // Pre-defined
  ], [
    VIDEO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track),
    track.info.decoderConfig.colorSpace ? colr(track) : null
  ]);
  var COLOR_PRIMARIES_MAP = {
    "bt709": 1,
    // ITU-R BT.709
    "bt470bg": 5,
    // ITU-R BT.470BG
    "smpte170m": 6
    // ITU-R BT.601 525 - SMPTE 170M
  };
  var TRANSFER_CHARACTERISTICS_MAP = {
    "bt709": 1,
    // ITU-R BT.709
    "smpte170m": 6,
    // SMPTE 170M
    "iec61966-2-1": 13
    // IEC 61966-2-1
  };
  var MATRIX_COEFFICIENTS_MAP = {
    "rgb": 0,
    // Identity
    "bt709": 1,
    // ITU-R BT.709
    "bt470bg": 5,
    // ITU-R BT.470BG
    "smpte170m": 6
    // SMPTE 170M
  };
  var colr = (track) => box("colr", [
    ascii("nclx"),
    // Colour type
    u16(COLOR_PRIMARIES_MAP[track.info.decoderConfig.colorSpace.primaries]),
    // Colour primaries
    u16(TRANSFER_CHARACTERISTICS_MAP[track.info.decoderConfig.colorSpace.transfer]),
    // Transfer characteristics
    u16(MATRIX_COEFFICIENTS_MAP[track.info.decoderConfig.colorSpace.matrix]),
    // Matrix coefficients
    u8((track.info.decoderConfig.colorSpace.fullRange ? 1 : 0) << 7)
    // Full range flag
  ]);
  var avcC = (track) => track.info.decoderConfig && box("avcC", [
    // For AVC, description is an AVCDecoderConfigurationRecord, so nothing else to do here
    ...new Uint8Array(track.info.decoderConfig.description)
  ]);
  var hvcC = (track) => track.info.decoderConfig && box("hvcC", [
    // For HEVC, description is a HEVCDecoderConfigurationRecord, so nothing else to do here
    ...new Uint8Array(track.info.decoderConfig.description)
  ]);
  var vpcC = (track) => {
    if (!track.info.decoderConfig) {
      return null;
    }
    let decoderConfig = track.info.decoderConfig;
    if (!decoderConfig.colorSpace) {
      throw new Error(`'colorSpace' is required in the decoder config for VP9.`);
    }
    let parts = decoderConfig.codec.split(".");
    let profile = Number(parts[1]);
    let level = Number(parts[2]);
    let bitDepth = Number(parts[3]);
    let chromaSubsampling = 0;
    let thirdByte = (bitDepth << 4) + (chromaSubsampling << 1) + Number(decoderConfig.colorSpace.fullRange);
    let colourPrimaries = 2;
    let transferCharacteristics = 2;
    let matrixCoefficients = 2;
    return fullBox("vpcC", 1, 0, [
      u8(profile),
      // Profile
      u8(level),
      // Level
      u8(thirdByte),
      // Bit depth, chroma subsampling, full range
      u8(colourPrimaries),
      // Colour primaries
      u8(transferCharacteristics),
      // Transfer characteristics
      u8(matrixCoefficients),
      // Matrix coefficients
      u16(0)
      // Codec initialization data size
    ]);
  };
  var av1C = () => {
    let marker = 1;
    let version = 1;
    let firstByte = (marker << 7) + version;
    return box("av1C", [
      firstByte,
      0,
      0,
      0
    ]);
  };
  var soundSampleDescription = (compressionType, track) => box(compressionType, [
    Array(6).fill(0),
    // Reserved
    u16(1),
    // Data reference index
    u16(0),
    // Version
    u16(0),
    // Revision level
    u32(0),
    // Vendor
    u16(track.info.numberOfChannels),
    // Number of channels
    u16(16),
    // Sample size (bits)
    u16(0),
    // Compression ID
    u16(0),
    // Packet size
    fixed_16_16(track.info.sampleRate)
    // Sample rate
  ], [
    AUDIO_CODEC_TO_CONFIGURATION_BOX[track.info.codec](track)
  ]);
  var esds = (track) => {
    let description = new Uint8Array(track.info.decoderConfig.description);
    return fullBox("esds", 0, 0, [
      // https://stackoverflow.com/a/54803118
      u32(58753152),
      // TAG(3) = Object Descriptor ([2])
      u8(32 + description.byteLength),
      // length of this OD (which includes the next 2 tags)
      u16(1),
      // ES_ID = 1
      u8(0),
      // flags etc = 0
      u32(75530368),
      // TAG(4) = ES Descriptor ([2]) embedded in above OD
      u8(18 + description.byteLength),
      // length of this ESD
      u8(64),
      // MPEG-4 Audio
      u8(21),
      // stream type(6bits)=5 audio, flags(2bits)=1
      u24(0),
      // 24bit buffer size
      u32(130071),
      // max bitrate
      u32(130071),
      // avg bitrate
      u32(92307584),
      // TAG(5) = ASC ([2],[3]) embedded in above OD
      u8(description.byteLength),
      // length
      ...description,
      u32(109084800),
      // TAG(6)
      u8(1),
      // length
      u8(2)
      // data
    ]);
  };
  var dOps = (track) => {
    let preskip = 3840;
    let gain = 0;
    const description = track.info.decoderConfig?.description;
    if (description) {
      if (description.byteLength < 18) {
        throw new TypeError("Invalid decoder description provided for Opus; must be at least 18 bytes long.");
      }
      const view2 = ArrayBuffer.isView(description) ? new DataView(description.buffer, description.byteOffset, description.byteLength) : new DataView(description);
      preskip = view2.getUint16(10, true);
      gain = view2.getInt16(14, true);
    }
    return box("dOps", [
      u8(0),
      // Version
      u8(track.info.numberOfChannels),
      // OutputChannelCount
      u16(preskip),
      u32(track.info.sampleRate),
      // InputSampleRate
      fixed_8_8(gain),
      // OutputGain
      u8(0)
      // ChannelMappingFamily
    ]);
  };
  var stts = (track) => {
    return fullBox("stts", 0, 0, [
      u32(track.timeToSampleTable.length),
      // Number of entries
      track.timeToSampleTable.map((x) => [
        // Time-to-sample table
        u32(x.sampleCount),
        // Sample count
        u32(x.sampleDelta)
        // Sample duration
      ])
    ]);
  };
  var stss = (track) => {
    if (track.samples.every((x) => x.type === "key"))
      return null;
    let keySamples = [...track.samples.entries()].filter(([, sample]) => sample.type === "key");
    return fullBox("stss", 0, 0, [
      u32(keySamples.length),
      // Number of entries
      keySamples.map(([index]) => u32(index + 1))
      // Sync sample table
    ]);
  };
  var stsc = (track) => {
    return fullBox("stsc", 0, 0, [
      u32(track.compactlyCodedChunkTable.length),
      // Number of entries
      track.compactlyCodedChunkTable.map((x) => [
        // Sample-to-chunk table
        u32(x.firstChunk),
        // First chunk
        u32(x.samplesPerChunk),
        // Samples per chunk
        u32(1)
        // Sample description index
      ])
    ]);
  };
  var stsz = (track) => fullBox("stsz", 0, 0, [
    u32(0),
    // Sample size (0 means non-constant size)
    u32(track.samples.length),
    // Number of entries
    track.samples.map((x) => u32(x.size))
    // Sample size table
  ]);
  var stco = (track) => {
    if (track.finalizedChunks.length > 0 && last(track.finalizedChunks).offset >= 2 ** 32) {
      return fullBox("co64", 0, 0, [
        u32(track.finalizedChunks.length),
        // Number of entries
        track.finalizedChunks.map((x) => u64(x.offset))
        // Chunk offset table
      ]);
    }
    return fullBox("stco", 0, 0, [
      u32(track.finalizedChunks.length),
      // Number of entries
      track.finalizedChunks.map((x) => u32(x.offset))
      // Chunk offset table
    ]);
  };
  var ctts = (track) => {
    return fullBox("ctts", 0, 0, [
      u32(track.compositionTimeOffsetTable.length),
      // Number of entries
      track.compositionTimeOffsetTable.map((x) => [
        // Time-to-sample table
        u32(x.sampleCount),
        // Sample count
        u32(x.sampleCompositionTimeOffset)
        // Sample offset
      ])
    ]);
  };
  var mvex = (tracks) => {
    return box("mvex", null, tracks.map(trex));
  };
  var trex = (track) => {
    return fullBox("trex", 0, 0, [
      u32(track.id),
      // Track ID
      u32(1),
      // Default sample description index
      u32(0),
      // Default sample duration
      u32(0),
      // Default sample size
      u32(0)
      // Default sample flags
    ]);
  };
  var moof = (sequenceNumber, tracks) => {
    return box("moof", null, [
      mfhd(sequenceNumber),
      ...tracks.map(traf)
    ]);
  };
  var mfhd = (sequenceNumber) => {
    return fullBox("mfhd", 0, 0, [
      u32(sequenceNumber)
      // Sequence number
    ]);
  };
  var fragmentSampleFlags = (sample) => {
    let byte1 = 0;
    let byte2 = 0;
    let byte3 = 0;
    let byte4 = 0;
    let sampleIsDifferenceSample = sample.type === "delta";
    byte2 |= +sampleIsDifferenceSample;
    if (sampleIsDifferenceSample) {
      byte1 |= 1;
    } else {
      byte1 |= 2;
    }
    return byte1 << 24 | byte2 << 16 | byte3 << 8 | byte4;
  };
  var traf = (track) => {
    return box("traf", null, [
      tfhd(track),
      tfdt(track),
      trun(track)
    ]);
  };
  var tfhd = (track) => {
    let tfFlags = 0;
    tfFlags |= 8;
    tfFlags |= 16;
    tfFlags |= 32;
    tfFlags |= 131072;
    let referenceSample = track.currentChunk.samples[1] ?? track.currentChunk.samples[0];
    let referenceSampleInfo = {
      duration: referenceSample.timescaleUnitsToNextSample,
      size: referenceSample.size,
      flags: fragmentSampleFlags(referenceSample)
    };
    return fullBox("tfhd", 0, tfFlags, [
      u32(track.id),
      // Track ID
      u32(referenceSampleInfo.duration),
      // Default sample duration
      u32(referenceSampleInfo.size),
      // Default sample size
      u32(referenceSampleInfo.flags)
      // Default sample flags
    ]);
  };
  var tfdt = (track) => {
    return fullBox("tfdt", 1, 0, [
      u64(intoTimescale(track.currentChunk.startTimestamp, track.timescale))
      // Base Media Decode Time
    ]);
  };
  var trun = (track) => {
    let allSampleDurations = track.currentChunk.samples.map((x) => x.timescaleUnitsToNextSample);
    let allSampleSizes = track.currentChunk.samples.map((x) => x.size);
    let allSampleFlags = track.currentChunk.samples.map(fragmentSampleFlags);
    let allSampleCompositionTimeOffsets = track.currentChunk.samples.map((x) => intoTimescale(x.presentationTimestamp - x.decodeTimestamp, track.timescale));
    let uniqueSampleDurations = new Set(allSampleDurations);
    let uniqueSampleSizes = new Set(allSampleSizes);
    let uniqueSampleFlags = new Set(allSampleFlags);
    let uniqueSampleCompositionTimeOffsets = new Set(allSampleCompositionTimeOffsets);
    let firstSampleFlagsPresent = uniqueSampleFlags.size === 2 && allSampleFlags[0] !== allSampleFlags[1];
    let sampleDurationPresent = uniqueSampleDurations.size > 1;
    let sampleSizePresent = uniqueSampleSizes.size > 1;
    let sampleFlagsPresent = !firstSampleFlagsPresent && uniqueSampleFlags.size > 1;
    let sampleCompositionTimeOffsetsPresent = uniqueSampleCompositionTimeOffsets.size > 1 || [...uniqueSampleCompositionTimeOffsets].some((x) => x !== 0);
    let flags = 0;
    flags |= 1;
    flags |= 4 * +firstSampleFlagsPresent;
    flags |= 256 * +sampleDurationPresent;
    flags |= 512 * +sampleSizePresent;
    flags |= 1024 * +sampleFlagsPresent;
    flags |= 2048 * +sampleCompositionTimeOffsetsPresent;
    return fullBox("trun", 1, flags, [
      u32(track.currentChunk.samples.length),
      // Sample count
      u32(track.currentChunk.offset - track.currentChunk.moofOffset || 0),
      // Data offset
      firstSampleFlagsPresent ? u32(allSampleFlags[0]) : [],
      track.currentChunk.samples.map((_, i) => [
        sampleDurationPresent ? u32(allSampleDurations[i]) : [],
        // Sample duration
        sampleSizePresent ? u32(allSampleSizes[i]) : [],
        // Sample size
        sampleFlagsPresent ? u32(allSampleFlags[i]) : [],
        // Sample flags
        // Sample composition time offsets
        sampleCompositionTimeOffsetsPresent ? i32(allSampleCompositionTimeOffsets[i]) : []
      ])
    ]);
  };
  var mfra = (tracks) => {
    return box("mfra", null, [
      ...tracks.map(tfra),
      mfro()
    ]);
  };
  var tfra = (track, trackIndex) => {
    let version = 1;
    return fullBox("tfra", version, 0, [
      u32(track.id),
      // Track ID
      u32(63),
      // This specifies that traf number, trun number and sample number are 32-bit ints
      u32(track.finalizedChunks.length),
      // Number of entries
      track.finalizedChunks.map((chunk) => [
        u64(intoTimescale(chunk.startTimestamp, track.timescale)),
        // Time
        u64(chunk.moofOffset),
        // moof offset
        u32(trackIndex + 1),
        // traf number
        u32(1),
        // trun number
        u32(1)
        // Sample number
      ])
    ]);
  };
  var mfro = () => {
    return fullBox("mfro", 0, 0, [
      // This value needs to be overwritten manually from the outside, where the actual size of the enclosing mfra box
      // is known
      u32(0)
      // Size
    ]);
  };
  var VIDEO_CODEC_TO_BOX_NAME = {
    "avc": "avc1",
    "hevc": "hvc1",
    "vp9": "vp09",
    "av1": "av01"
  };
  var VIDEO_CODEC_TO_CONFIGURATION_BOX = {
    "avc": avcC,
    "hevc": hvcC,
    "vp9": vpcC,
    "av1": av1C
  };
  var AUDIO_CODEC_TO_BOX_NAME = {
    "aac": "mp4a",
    "opus": "Opus"
  };
  var AUDIO_CODEC_TO_CONFIGURATION_BOX = {
    "aac": esds,
    "opus": dOps
  };

  // src/target.ts
  var isTarget = Symbol("isTarget");
  var Target = class {
  };
  isTarget;
  var ArrayBufferTarget = class extends Target {
    constructor() {
      super(...arguments);
      this.buffer = null;
    }
  };
  var StreamTarget = class extends Target {
    constructor(options) {
      super();
      this.options = options;
      if (typeof options !== "object") {
        throw new TypeError("StreamTarget requires an options object to be passed to its constructor.");
      }
      if (options.onData) {
        if (typeof options.onData !== "function") {
          throw new TypeError("options.onData, when provided, must be a function.");
        }
        if (options.onData.length < 2) {
          throw new TypeError(
            "options.onData, when provided, must be a function that takes in at least two arguments (data and position). Ignoring the position argument, which specifies the byte offset at which the data is to be written, can lead to broken outputs."
          );
        }
      }
      if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
        throw new TypeError("options.chunked, when provided, must be a boolean.");
      }
      if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize < 1024)) {
        throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");
      }
    }
  };
  var FileSystemWritableFileStreamTarget = class extends Target {
    constructor(stream, options) {
      super();
      this.stream = stream;
      this.options = options;
      if (!(stream instanceof FileSystemWritableFileStream)) {
        throw new TypeError("FileSystemWritableFileStreamTarget requires a FileSystemWritableFileStream instance.");
      }
      if (options !== void 0 && typeof options !== "object") {
        throw new TypeError("FileSystemWritableFileStreamTarget's options, when provided, must be an object.");
      }
      if (options) {
        if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
          throw new TypeError("options.chunkSize, when provided, must be a positive integer");
        }
      }
    }
  };

  // src/writer.ts
  var _helper, _helperView;
  var Writer = class {
    constructor() {
      this.pos = 0;
      __privateAdd(this, _helper, new Uint8Array(8));
      __privateAdd(this, _helperView, new DataView(__privateGet(this, _helper).buffer));
      /**
       * Stores the position from the start of the file to where boxes elements have been written. This is used to
       * rewrite/edit elements that were already added before, and to measure sizes of things.
       */
      this.offsets = /* @__PURE__ */ new WeakMap();
    }
    /** Sets the current position for future writes to a new one. */
    seek(newPos) {
      this.pos = newPos;
    }
    writeU32(value) {
      __privateGet(this, _helperView).setUint32(0, value, false);
      this.write(__privateGet(this, _helper).subarray(0, 4));
    }
    writeU64(value) {
      __privateGet(this, _helperView).setUint32(0, Math.floor(value / 2 ** 32), false);
      __privateGet(this, _helperView).setUint32(4, value, false);
      this.write(__privateGet(this, _helper).subarray(0, 8));
    }
    writeAscii(text) {
      for (let i = 0; i < text.length; i++) {
        __privateGet(this, _helperView).setUint8(i % 8, text.charCodeAt(i));
        if (i % 8 === 7)
          this.write(__privateGet(this, _helper));
      }
      if (text.length % 8 !== 0) {
        this.write(__privateGet(this, _helper).subarray(0, text.length % 8));
      }
    }
    writeBox(box2) {
      this.offsets.set(box2, this.pos);
      if (box2.contents && !box2.children) {
        this.writeBoxHeader(box2, box2.size ?? box2.contents.byteLength + 8);
        this.write(box2.contents);
      } else {
        let startPos = this.pos;
        this.writeBoxHeader(box2, 0);
        if (box2.contents)
          this.write(box2.contents);
        if (box2.children) {
          for (let child of box2.children)
            if (child)
              this.writeBox(child);
        }
        let endPos = this.pos;
        let size = box2.size ?? endPos - startPos;
        this.seek(startPos);
        this.writeBoxHeader(box2, size);
        this.seek(endPos);
      }
    }
    writeBoxHeader(box2, size) {
      this.writeU32(box2.largeSize ? 1 : size);
      this.writeAscii(box2.type);
      if (box2.largeSize)
        this.writeU64(size);
    }
    measureBoxHeader(box2) {
      return 8 + (box2.largeSize ? 8 : 0);
    }
    patchBox(box2) {
      let endPos = this.pos;
      this.seek(this.offsets.get(box2));
      this.writeBox(box2);
      this.seek(endPos);
    }
    measureBox(box2) {
      if (box2.contents && !box2.children) {
        let headerSize = this.measureBoxHeader(box2);
        return headerSize + box2.contents.byteLength;
      } else {
        let result = this.measureBoxHeader(box2);
        if (box2.contents)
          result += box2.contents.byteLength;
        if (box2.children) {
          for (let child of box2.children)
            if (child)
              result += this.measureBox(child);
        }
        return result;
      }
    }
  };
  _helper = new WeakMap();
  _helperView = new WeakMap();
  var _target, _buffer, _bytes, _maxPos, _ensureSize, ensureSize_fn;
  var ArrayBufferTargetWriter = class extends Writer {
    constructor(target) {
      super();
      __privateAdd(this, _ensureSize);
      __privateAdd(this, _target, void 0);
      __privateAdd(this, _buffer, new ArrayBuffer(2 ** 16));
      __privateAdd(this, _bytes, new Uint8Array(__privateGet(this, _buffer)));
      __privateAdd(this, _maxPos, 0);
      __privateSet(this, _target, target);
    }
    write(data) {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos + data.byteLength);
      __privateGet(this, _bytes).set(data, this.pos);
      this.pos += data.byteLength;
      __privateSet(this, _maxPos, Math.max(__privateGet(this, _maxPos), this.pos));
    }
    finalize() {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos);
      __privateGet(this, _target).buffer = __privateGet(this, _buffer).slice(0, Math.max(__privateGet(this, _maxPos), this.pos));
    }
  };
  _target = new WeakMap();
  _buffer = new WeakMap();
  _bytes = new WeakMap();
  _maxPos = new WeakMap();
  _ensureSize = new WeakSet();
  ensureSize_fn = function(size) {
    let newLength = __privateGet(this, _buffer).byteLength;
    while (newLength < size)
      newLength *= 2;
    if (newLength === __privateGet(this, _buffer).byteLength)
      return;
    let newBuffer = new ArrayBuffer(newLength);
    let newBytes = new Uint8Array(newBuffer);
    newBytes.set(__privateGet(this, _bytes), 0);
    __privateSet(this, _buffer, newBuffer);
    __privateSet(this, _bytes, newBytes);
  };
  var DEFAULT_CHUNK_SIZE = 2 ** 24;
  var MAX_CHUNKS_AT_ONCE = 2;
  var _target2, _sections, _chunked, _chunkSize, _chunks, _writeDataIntoChunks, writeDataIntoChunks_fn, _insertSectionIntoChunk, insertSectionIntoChunk_fn, _createChunk, createChunk_fn, _flushChunks, flushChunks_fn;
  var StreamTargetWriter = class extends Writer {
    constructor(target) {
      super();
      __privateAdd(this, _writeDataIntoChunks);
      __privateAdd(this, _insertSectionIntoChunk);
      __privateAdd(this, _createChunk);
      __privateAdd(this, _flushChunks);
      __privateAdd(this, _target2, void 0);
      __privateAdd(this, _sections, []);
      __privateAdd(this, _chunked, void 0);
      __privateAdd(this, _chunkSize, void 0);
      /**
       * The data is divided up into fixed-size chunks, whose contents are first filled in RAM and then flushed out.
       * A chunk is flushed if all of its contents have been written.
       */
      __privateAdd(this, _chunks, []);
      __privateSet(this, _target2, target);
      __privateSet(this, _chunked, target.options?.chunked ?? false);
      __privateSet(this, _chunkSize, target.options?.chunkSize ?? DEFAULT_CHUNK_SIZE);
    }
    write(data) {
      __privateGet(this, _sections).push({
        data: data.slice(),
        start: this.pos
      });
      this.pos += data.byteLength;
    }
    flush() {
      if (__privateGet(this, _sections).length === 0)
        return;
      let chunks = [];
      let sorted = [...__privateGet(this, _sections)].sort((a, b) => a.start - b.start);
      chunks.push({
        start: sorted[0].start,
        size: sorted[0].data.byteLength
      });
      for (let i = 1; i < sorted.length; i++) {
        let lastChunk = chunks[chunks.length - 1];
        let section = sorted[i];
        if (section.start <= lastChunk.start + lastChunk.size) {
          lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
        } else {
          chunks.push({
            start: section.start,
            size: section.data.byteLength
          });
        }
      }
      for (let chunk of chunks) {
        chunk.data = new Uint8Array(chunk.size);
        for (let section of __privateGet(this, _sections)) {
          if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
            chunk.data.set(section.data, section.start - chunk.start);
          }
        }
        if (__privateGet(this, _chunked)) {
          __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, chunk.data, chunk.start);
          __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
        } else {
          __privateGet(this, _target2).options.onData?.(chunk.data, chunk.start);
        }
      }
      __privateGet(this, _sections).length = 0;
    }
    finalize() {
      if (__privateGet(this, _chunked)) {
        __privateMethod(this, _flushChunks, flushChunks_fn).call(this, true);
      }
    }
  };
  _target2 = new WeakMap();
  _sections = new WeakMap();
  _chunked = new WeakMap();
  _chunkSize = new WeakMap();
  _chunks = new WeakMap();
  _writeDataIntoChunks = new WeakSet();
  writeDataIntoChunks_fn = function(data, position) {
    let chunkIndex = __privateGet(this, _chunks).findIndex((x) => x.start <= position && position < x.start + __privateGet(this, _chunkSize));
    if (chunkIndex === -1)
      chunkIndex = __privateMethod(this, _createChunk, createChunk_fn).call(this, position);
    let chunk = __privateGet(this, _chunks)[chunkIndex];
    let relativePosition = position - chunk.start;
    let toWrite = data.subarray(0, Math.min(__privateGet(this, _chunkSize) - relativePosition, data.byteLength));
    chunk.data.set(toWrite, relativePosition);
    let section = {
      start: relativePosition,
      end: relativePosition + toWrite.byteLength
    };
    __privateMethod(this, _insertSectionIntoChunk, insertSectionIntoChunk_fn).call(this, chunk, section);
    if (chunk.written[0].start === 0 && chunk.written[0].end === __privateGet(this, _chunkSize)) {
      chunk.shouldFlush = true;
    }
    if (__privateGet(this, _chunks).length > MAX_CHUNKS_AT_ONCE) {
      for (let i = 0; i < __privateGet(this, _chunks).length - 1; i++) {
        __privateGet(this, _chunks)[i].shouldFlush = true;
      }
      __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
    }
    if (toWrite.byteLength < data.byteLength) {
      __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, data.subarray(toWrite.byteLength), position + toWrite.byteLength);
    }
  };
  _insertSectionIntoChunk = new WeakSet();
  insertSectionIntoChunk_fn = function(chunk, section) {
    let low = 0;
    let high = chunk.written.length - 1;
    let index = -1;
    while (low <= high) {
      let mid = Math.floor(low + (high - low + 1) / 2);
      if (chunk.written[mid].start <= section.start) {
        low = mid + 1;
        index = mid;
      } else {
        high = mid - 1;
      }
    }
    chunk.written.splice(index + 1, 0, section);
    if (index === -1 || chunk.written[index].end < section.start)
      index++;
    while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
      chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
      chunk.written.splice(index + 1, 1);
    }
  };
  _createChunk = new WeakSet();
  createChunk_fn = function(includesPosition) {
    let start = Math.floor(includesPosition / __privateGet(this, _chunkSize)) * __privateGet(this, _chunkSize);
    let chunk = {
      start,
      data: new Uint8Array(__privateGet(this, _chunkSize)),
      written: [],
      shouldFlush: false
    };
    __privateGet(this, _chunks).push(chunk);
    __privateGet(this, _chunks).sort((a, b) => a.start - b.start);
    return __privateGet(this, _chunks).indexOf(chunk);
  };
  _flushChunks = new WeakSet();
  flushChunks_fn = function(force = false) {
    for (let i = 0; i < __privateGet(this, _chunks).length; i++) {
      let chunk = __privateGet(this, _chunks)[i];
      if (!chunk.shouldFlush && !force)
        continue;
      for (let section of chunk.written) {
        __privateGet(this, _target2).options.onData?.(
          chunk.data.subarray(section.start, section.end),
          chunk.start + section.start
        );
      }
      __privateGet(this, _chunks).splice(i--, 1);
    }
  };
  var FileSystemWritableFileStreamTargetWriter = class extends StreamTargetWriter {
    constructor(target) {
      super(new StreamTarget({
        onData: (data, position) => target.stream.write({
          type: "write",
          data,
          position
        }),
        chunked: true,
        chunkSize: target.options?.chunkSize
      }));
    }
  };

  // src/muxer.ts
  var GLOBAL_TIMESCALE = 1e3;
  var SUPPORTED_VIDEO_CODECS = ["avc", "hevc", "vp9", "av1"];
  var SUPPORTED_AUDIO_CODECS = ["aac", "opus"];
  var TIMESTAMP_OFFSET = 2082844800;
  var FIRST_TIMESTAMP_BEHAVIORS = ["strict", "offset", "cross-track-offset"];
  var _options, _writer, _ftypSize, _mdat, _videoTrack, _audioTrack, _creationTime, _finalizedChunks, _nextFragmentNumber, _videoSampleQueue, _audioSampleQueue, _finalized, _validateOptions, validateOptions_fn, _writeHeader, writeHeader_fn, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn, _prepareTracks, prepareTracks_fn, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn, _createSampleForTrack, createSampleForTrack_fn, _addSampleToTrack, addSampleToTrack_fn, _validateTimestamp, validateTimestamp_fn, _finalizeCurrentChunk, finalizeCurrentChunk_fn, _finalizeFragment, finalizeFragment_fn, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn, _ensureNotFinalized, ensureNotFinalized_fn;
  var Muxer = class {
    constructor(options) {
      __privateAdd(this, _validateOptions);
      __privateAdd(this, _writeHeader);
      __privateAdd(this, _computeMoovSizeUpperBound);
      __privateAdd(this, _prepareTracks);
      // https://wiki.multimedia.cx/index.php/MPEG-4_Audio
      __privateAdd(this, _generateMpeg4AudioSpecificConfig);
      __privateAdd(this, _createSampleForTrack);
      __privateAdd(this, _addSampleToTrack);
      __privateAdd(this, _validateTimestamp);
      __privateAdd(this, _finalizeCurrentChunk);
      __privateAdd(this, _finalizeFragment);
      __privateAdd(this, _maybeFlushStreamingTargetWriter);
      __privateAdd(this, _ensureNotFinalized);
      __privateAdd(this, _options, void 0);
      __privateAdd(this, _writer, void 0);
      __privateAdd(this, _ftypSize, void 0);
      __privateAdd(this, _mdat, void 0);
      __privateAdd(this, _videoTrack, null);
      __privateAdd(this, _audioTrack, null);
      __privateAdd(this, _creationTime, Math.floor(Date.now() / 1e3) + TIMESTAMP_OFFSET);
      __privateAdd(this, _finalizedChunks, []);
      // Fields for fragmented MP4:
      __privateAdd(this, _nextFragmentNumber, 1);
      __privateAdd(this, _videoSampleQueue, []);
      __privateAdd(this, _audioSampleQueue, []);
      __privateAdd(this, _finalized, false);
      __privateMethod(this, _validateOptions, validateOptions_fn).call(this, options);
      options.video = deepClone(options.video);
      options.audio = deepClone(options.audio);
      options.fastStart = deepClone(options.fastStart);
      this.target = options.target;
      __privateSet(this, _options, {
        firstTimestampBehavior: "strict",
        ...options
      });
      if (options.target instanceof ArrayBufferTarget) {
        __privateSet(this, _writer, new ArrayBufferTargetWriter(options.target));
      } else if (options.target instanceof StreamTarget) {
        __privateSet(this, _writer, new StreamTargetWriter(options.target));
      } else if (options.target instanceof FileSystemWritableFileStreamTarget) {
        __privateSet(this, _writer, new FileSystemWritableFileStreamTargetWriter(options.target));
      } else {
        throw new Error(`Invalid target: ${options.target}`);
      }
      __privateMethod(this, _prepareTracks, prepareTracks_fn).call(this);
      __privateMethod(this, _writeHeader, writeHeader_fn).call(this);
    }
    addVideoChunk(sample, meta, timestamp, compositionTimeOffset) {
      if (!(sample instanceof EncodedVideoChunk)) {
        throw new TypeError("addVideoChunk's first argument (sample) must be of type EncodedVideoChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addVideoChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
        throw new TypeError(
          "addVideoChunk's fourth argument (compositionTimeOffset), when provided, must be a real number."
        );
      }
      let data = new Uint8Array(sample.byteLength);
      sample.copyTo(data);
      this.addVideoChunkRaw(
        data,
        sample.type,
        timestamp ?? sample.timestamp,
        sample.duration,
        meta,
        compositionTimeOffset
      );
    }
    addVideoChunkRaw(data, type, timestamp, duration, meta, compositionTimeOffset) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addVideoChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addVideoChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addVideoChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("addVideoChunkRaw's fourth argument (duration) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunkRaw's fifth argument (meta), when provided, must be an object.");
      }
      if (compositionTimeOffset !== void 0 && !Number.isFinite(compositionTimeOffset)) {
        throw new TypeError(
          "addVideoChunkRaw's sixth argument (compositionTimeOffset), when provided, must be a real number."
        );
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).video)
        throw new Error("No video track declared.");
      if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _videoTrack).samples.length === __privateGet(this, _options).fastStart.expectedVideoChunks) {
        throw new Error(`Cannot add more video chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedVideoChunks}).`);
      }
      let videoSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _videoTrack), data, type, timestamp, duration, meta, compositionTimeOffset);
      if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _audioTrack)) {
        while (__privateGet(this, _audioSampleQueue).length > 0 && __privateGet(this, _audioSampleQueue)[0].decodeTimestamp <= videoSample.decodeTimestamp) {
          let audioSample = __privateGet(this, _audioSampleQueue).shift();
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        }
        if (videoSample.decodeTimestamp <= __privateGet(this, _audioTrack).lastDecodeTimestamp) {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        } else {
          __privateGet(this, _videoSampleQueue).push(videoSample);
        }
      } else {
        __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
      }
    }
    addAudioChunk(sample, meta, timestamp) {
      if (!(sample instanceof EncodedAudioChunk)) {
        throw new TypeError("addAudioChunk's first argument (sample) must be of type EncodedAudioChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addAudioChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      let data = new Uint8Array(sample.byteLength);
      sample.copyTo(data);
      this.addAudioChunkRaw(data, sample.type, timestamp ?? sample.timestamp, sample.duration, meta);
    }
    addAudioChunkRaw(data, type, timestamp, duration, meta) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addAudioChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addAudioChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addAudioChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (!Number.isFinite(duration) || duration < 0) {
        throw new TypeError("addAudioChunkRaw's fourth argument (duration) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunkRaw's fifth argument (meta), when provided, must be an object.");
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).audio)
        throw new Error("No audio track declared.");
      if (typeof __privateGet(this, _options).fastStart === "object" && __privateGet(this, _audioTrack).samples.length === __privateGet(this, _options).fastStart.expectedAudioChunks) {
        throw new Error(`Cannot add more audio chunks than specified in 'fastStart' (${__privateGet(this, _options).fastStart.expectedAudioChunks}).`);
      }
      let audioSample = __privateMethod(this, _createSampleForTrack, createSampleForTrack_fn).call(this, __privateGet(this, _audioTrack), data, type, timestamp, duration, meta);
      if (__privateGet(this, _options).fastStart === "fragmented" && __privateGet(this, _videoTrack)) {
        while (__privateGet(this, _videoSampleQueue).length > 0 && __privateGet(this, _videoSampleQueue)[0].decodeTimestamp <= audioSample.decodeTimestamp) {
          let videoSample = __privateGet(this, _videoSampleQueue).shift();
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        }
        if (audioSample.decodeTimestamp <= __privateGet(this, _videoTrack).lastDecodeTimestamp) {
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        } else {
          __privateGet(this, _audioSampleQueue).push(audioSample);
        }
      } else {
        __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
      }
    }
    /** Finalizes the file, making it ready for use. Must be called after all video and audio chunks have been added. */
    finalize() {
      if (__privateGet(this, _finalized)) {
        throw new Error("Cannot finalize a muxer more than once.");
      }
      if (__privateGet(this, _options).fastStart === "fragmented") {
        for (let videoSample of __privateGet(this, _videoSampleQueue))
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _videoTrack), videoSample);
        for (let audioSample of __privateGet(this, _audioSampleQueue))
          __privateMethod(this, _addSampleToTrack, addSampleToTrack_fn).call(this, __privateGet(this, _audioTrack), audioSample);
        __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this, false);
      } else {
        if (__privateGet(this, _videoTrack))
          __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _videoTrack));
        if (__privateGet(this, _audioTrack))
          __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, __privateGet(this, _audioTrack));
      }
      let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter(Boolean);
      if (__privateGet(this, _options).fastStart === "in-memory") {
        let mdatSize;
        for (let i = 0; i < 2; i++) {
          let movieBox2 = moov(tracks, __privateGet(this, _creationTime));
          let movieBoxSize = __privateGet(this, _writer).measureBox(movieBox2);
          mdatSize = __privateGet(this, _writer).measureBox(__privateGet(this, _mdat));
          let currentChunkPos = __privateGet(this, _writer).pos + movieBoxSize + mdatSize;
          for (let chunk of __privateGet(this, _finalizedChunks)) {
            chunk.offset = currentChunkPos;
            for (let { data } of chunk.samples) {
              currentChunkPos += data.byteLength;
              mdatSize += data.byteLength;
            }
          }
          if (currentChunkPos < 2 ** 32)
            break;
          if (mdatSize >= 2 ** 32)
            __privateGet(this, _mdat).largeSize = true;
        }
        let movieBox = moov(tracks, __privateGet(this, _creationTime));
        __privateGet(this, _writer).writeBox(movieBox);
        __privateGet(this, _mdat).size = mdatSize;
        __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
        for (let chunk of __privateGet(this, _finalizedChunks)) {
          for (let sample of chunk.samples) {
            __privateGet(this, _writer).write(sample.data);
            sample.data = null;
          }
        }
      } else if (__privateGet(this, _options).fastStart === "fragmented") {
        let startPos = __privateGet(this, _writer).pos;
        let mfraBox = mfra(tracks);
        __privateGet(this, _writer).writeBox(mfraBox);
        let mfraBoxSize = __privateGet(this, _writer).pos - startPos;
        __privateGet(this, _writer).seek(__privateGet(this, _writer).pos - 4);
        __privateGet(this, _writer).writeU32(mfraBoxSize);
      } else {
        let mdatPos = __privateGet(this, _writer).offsets.get(__privateGet(this, _mdat));
        let mdatSize = __privateGet(this, _writer).pos - mdatPos;
        __privateGet(this, _mdat).size = mdatSize;
        __privateGet(this, _mdat).largeSize = mdatSize >= 2 ** 32;
        __privateGet(this, _writer).patchBox(__privateGet(this, _mdat));
        let movieBox = moov(tracks, __privateGet(this, _creationTime));
        if (typeof __privateGet(this, _options).fastStart === "object") {
          __privateGet(this, _writer).seek(__privateGet(this, _ftypSize));
          __privateGet(this, _writer).writeBox(movieBox);
          let remainingBytes = mdatPos - __privateGet(this, _writer).pos;
          __privateGet(this, _writer).writeBox(free(remainingBytes));
        } else {
          __privateGet(this, _writer).writeBox(movieBox);
        }
      }
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
      __privateGet(this, _writer).finalize();
      __privateSet(this, _finalized, true);
    }
  };
  _options = new WeakMap();
  _writer = new WeakMap();
  _ftypSize = new WeakMap();
  _mdat = new WeakMap();
  _videoTrack = new WeakMap();
  _audioTrack = new WeakMap();
  _creationTime = new WeakMap();
  _finalizedChunks = new WeakMap();
  _nextFragmentNumber = new WeakMap();
  _videoSampleQueue = new WeakMap();
  _audioSampleQueue = new WeakMap();
  _finalized = new WeakMap();
  _validateOptions = new WeakSet();
  validateOptions_fn = function(options) {
    if (typeof options !== "object") {
      throw new TypeError("The muxer requires an options object to be passed to its constructor.");
    }
    if (!(options.target instanceof Target)) {
      throw new TypeError("The target must be provided and an instance of Target.");
    }
    if (options.video) {
      if (!SUPPORTED_VIDEO_CODECS.includes(options.video.codec)) {
        throw new TypeError(`Unsupported video codec: ${options.video.codec}`);
      }
      if (!Number.isInteger(options.video.width) || options.video.width <= 0) {
        throw new TypeError(`Invalid video width: ${options.video.width}. Must be a positive integer.`);
      }
      if (!Number.isInteger(options.video.height) || options.video.height <= 0) {
        throw new TypeError(`Invalid video height: ${options.video.height}. Must be a positive integer.`);
      }
      const videoRotation = options.video.rotation;
      if (typeof videoRotation === "number" && ![0, 90, 180, 270].includes(videoRotation)) {
        throw new TypeError(`Invalid video rotation: ${videoRotation}. Has to be 0, 90, 180 or 270.`);
      } else if (Array.isArray(videoRotation) && (videoRotation.length !== 9 || videoRotation.some((value) => typeof value !== "number"))) {
        throw new TypeError(`Invalid video transformation matrix: ${videoRotation.join()}`);
      }
      if (options.video.frameRate !== void 0 && (!Number.isInteger(options.video.frameRate) || options.video.frameRate <= 0)) {
        throw new TypeError(
          `Invalid video frame rate: ${options.video.frameRate}. Must be a positive integer.`
        );
      }
    }
    if (options.audio) {
      if (!SUPPORTED_AUDIO_CODECS.includes(options.audio.codec)) {
        throw new TypeError(`Unsupported audio codec: ${options.audio.codec}`);
      }
      if (!Number.isInteger(options.audio.numberOfChannels) || options.audio.numberOfChannels <= 0) {
        throw new TypeError(
          `Invalid number of audio channels: ${options.audio.numberOfChannels}. Must be a positive integer.`
        );
      }
      if (!Number.isInteger(options.audio.sampleRate) || options.audio.sampleRate <= 0) {
        throw new TypeError(
          `Invalid audio sample rate: ${options.audio.sampleRate}. Must be a positive integer.`
        );
      }
    }
    if (options.firstTimestampBehavior && !FIRST_TIMESTAMP_BEHAVIORS.includes(options.firstTimestampBehavior)) {
      throw new TypeError(`Invalid first timestamp behavior: ${options.firstTimestampBehavior}`);
    }
    if (typeof options.fastStart === "object") {
      if (options.video) {
        if (options.fastStart.expectedVideoChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedVideoChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedVideoChunks) || options.fastStart.expectedVideoChunks < 0) {
          throw new TypeError(`'expectedVideoChunks' must be a non-negative integer.`);
        }
      }
      if (options.audio) {
        if (options.fastStart.expectedAudioChunks === void 0) {
          throw new TypeError(`'fastStart' is an object but is missing property 'expectedAudioChunks'.`);
        } else if (!Number.isInteger(options.fastStart.expectedAudioChunks) || options.fastStart.expectedAudioChunks < 0) {
          throw new TypeError(`'expectedAudioChunks' must be a non-negative integer.`);
        }
      }
    } else if (![false, "in-memory", "fragmented"].includes(options.fastStart)) {
      throw new TypeError(`'fastStart' option must be false, 'in-memory', 'fragmented' or an object.`);
    }
    if (options.minFragmentDuration !== void 0 && (!Number.isFinite(options.minFragmentDuration) || options.minFragmentDuration < 0)) {
      throw new TypeError(`'minFragmentDuration' must be a non-negative number.`);
    }
  };
  _writeHeader = new WeakSet();
  writeHeader_fn = function() {
    __privateGet(this, _writer).writeBox(ftyp({
      holdsAvc: __privateGet(this, _options).video?.codec === "avc",
      fragmented: __privateGet(this, _options).fastStart === "fragmented"
    }));
    __privateSet(this, _ftypSize, __privateGet(this, _writer).pos);
    if (__privateGet(this, _options).fastStart === "in-memory") {
      __privateSet(this, _mdat, mdat(false));
    } else if (__privateGet(this, _options).fastStart === "fragmented") {
    } else {
      if (typeof __privateGet(this, _options).fastStart === "object") {
        let moovSizeUpperBound = __privateMethod(this, _computeMoovSizeUpperBound, computeMoovSizeUpperBound_fn).call(this);
        __privateGet(this, _writer).seek(__privateGet(this, _writer).pos + moovSizeUpperBound);
      }
      __privateSet(this, _mdat, mdat(true));
      __privateGet(this, _writer).writeBox(__privateGet(this, _mdat));
    }
    __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
  };
  _computeMoovSizeUpperBound = new WeakSet();
  computeMoovSizeUpperBound_fn = function() {
    if (typeof __privateGet(this, _options).fastStart !== "object")
      return;
    let upperBound = 0;
    let sampleCounts = [
      __privateGet(this, _options).fastStart.expectedVideoChunks,
      __privateGet(this, _options).fastStart.expectedAudioChunks
    ];
    for (let n of sampleCounts) {
      if (!n)
        continue;
      upperBound += (4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += (4 + 4 + 4) * Math.ceil(2 / 3 * n);
      upperBound += 4 * n;
      upperBound += 8 * n;
    }
    upperBound += 4096;
    return upperBound;
  };
  _prepareTracks = new WeakSet();
  prepareTracks_fn = function() {
    if (__privateGet(this, _options).video) {
      __privateSet(this, _videoTrack, {
        id: 1,
        info: {
          type: "video",
          codec: __privateGet(this, _options).video.codec,
          width: __privateGet(this, _options).video.width,
          height: __privateGet(this, _options).video.height,
          rotation: __privateGet(this, _options).video.rotation ?? 0,
          decoderConfig: null
        },
        // The fallback contains many common frame rates as factors
        timescale: __privateGet(this, _options).video.frameRate ?? 57600,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      });
    }
    if (__privateGet(this, _options).audio) {
      __privateSet(this, _audioTrack, {
        id: __privateGet(this, _options).video ? 2 : 1,
        info: {
          type: "audio",
          codec: __privateGet(this, _options).audio.codec,
          numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
          sampleRate: __privateGet(this, _options).audio.sampleRate,
          decoderConfig: null
        },
        timescale: __privateGet(this, _options).audio.sampleRate,
        samples: [],
        finalizedChunks: [],
        currentChunk: null,
        firstDecodeTimestamp: void 0,
        lastDecodeTimestamp: -1,
        timeToSampleTable: [],
        compositionTimeOffsetTable: [],
        lastTimescaleUnits: null,
        lastSample: null,
        compactlyCodedChunkTable: []
      });
      if (__privateGet(this, _options).audio.codec === "aac") {
        let guessedCodecPrivate = __privateMethod(this, _generateMpeg4AudioSpecificConfig, generateMpeg4AudioSpecificConfig_fn).call(
          this,
          2,
          // Object type for AAC-LC, since it's the most common
          __privateGet(this, _options).audio.sampleRate,
          __privateGet(this, _options).audio.numberOfChannels
        );
        __privateGet(this, _audioTrack).info.decoderConfig = {
          codec: __privateGet(this, _options).audio.codec,
          description: guessedCodecPrivate,
          numberOfChannels: __privateGet(this, _options).audio.numberOfChannels,
          sampleRate: __privateGet(this, _options).audio.sampleRate
        };
      }
    }
  };
  _generateMpeg4AudioSpecificConfig = new WeakSet();
  generateMpeg4AudioSpecificConfig_fn = function(objectType, sampleRate, numberOfChannels) {
    let frequencyIndices = [96e3, 88200, 64e3, 48e3, 44100, 32e3, 24e3, 22050, 16e3, 12e3, 11025, 8e3, 7350];
    let frequencyIndex = frequencyIndices.indexOf(sampleRate);
    let channelConfig = numberOfChannels;
    let configBits = "";
    configBits += objectType.toString(2).padStart(5, "0");
    configBits += frequencyIndex.toString(2).padStart(4, "0");
    if (frequencyIndex === 15)
      configBits += sampleRate.toString(2).padStart(24, "0");
    configBits += channelConfig.toString(2).padStart(4, "0");
    let paddingLength = Math.ceil(configBits.length / 8) * 8;
    configBits = configBits.padEnd(paddingLength, "0");
    let configBytes = new Uint8Array(configBits.length / 8);
    for (let i = 0; i < configBits.length; i += 8) {
      configBytes[i / 8] = parseInt(configBits.slice(i, i + 8), 2);
    }
    return configBytes;
  };
  _createSampleForTrack = new WeakSet();
  createSampleForTrack_fn = function(track, data, type, timestamp, duration, meta, compositionTimeOffset) {
    let presentationTimestampInSeconds = timestamp / 1e6;
    let decodeTimestampInSeconds = (timestamp - (compositionTimeOffset ?? 0)) / 1e6;
    let durationInSeconds = duration / 1e6;
    let adjusted = __privateMethod(this, _validateTimestamp, validateTimestamp_fn).call(this, presentationTimestampInSeconds, decodeTimestampInSeconds, track);
    presentationTimestampInSeconds = adjusted.presentationTimestamp;
    decodeTimestampInSeconds = adjusted.decodeTimestamp;
    if (meta?.decoderConfig) {
      if (track.info.decoderConfig === null) {
        track.info.decoderConfig = meta.decoderConfig;
      } else {
        Object.assign(track.info.decoderConfig, meta.decoderConfig);
      }
    }
    let sample = {
      presentationTimestamp: presentationTimestampInSeconds,
      decodeTimestamp: decodeTimestampInSeconds,
      duration: durationInSeconds,
      data,
      size: data.byteLength,
      type,
      // Will be refined once the next sample comes in
      timescaleUnitsToNextSample: intoTimescale(durationInSeconds, track.timescale)
    };
    return sample;
  };
  _addSampleToTrack = new WeakSet();
  addSampleToTrack_fn = function(track, sample) {
    if (__privateGet(this, _options).fastStart !== "fragmented") {
      track.samples.push(sample);
    }
    const sampleCompositionTimeOffset = intoTimescale(sample.presentationTimestamp - sample.decodeTimestamp, track.timescale);
    if (track.lastTimescaleUnits !== null) {
      let timescaleUnits = intoTimescale(sample.decodeTimestamp, track.timescale, false);
      let delta = Math.round(timescaleUnits - track.lastTimescaleUnits);
      track.lastTimescaleUnits += delta;
      track.lastSample.timescaleUnitsToNextSample = delta;
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        let lastTableEntry = last(track.timeToSampleTable);
        if (lastTableEntry.sampleCount === 1) {
          lastTableEntry.sampleDelta = delta;
          lastTableEntry.sampleCount++;
        } else if (lastTableEntry.sampleDelta === delta) {
          lastTableEntry.sampleCount++;
        } else {
          lastTableEntry.sampleCount--;
          track.timeToSampleTable.push({
            sampleCount: 2,
            sampleDelta: delta
          });
        }
        const lastCompositionTimeOffsetTableEntry = last(track.compositionTimeOffsetTable);
        if (lastCompositionTimeOffsetTableEntry.sampleCompositionTimeOffset === sampleCompositionTimeOffset) {
          lastCompositionTimeOffsetTableEntry.sampleCount++;
        } else {
          track.compositionTimeOffsetTable.push({
            sampleCount: 1,
            sampleCompositionTimeOffset
          });
        }
      }
    } else {
      track.lastTimescaleUnits = 0;
      if (__privateGet(this, _options).fastStart !== "fragmented") {
        track.timeToSampleTable.push({
          sampleCount: 1,
          sampleDelta: intoTimescale(sample.duration, track.timescale)
        });
        track.compositionTimeOffsetTable.push({
          sampleCount: 1,
          sampleCompositionTimeOffset
        });
      }
    }
    track.lastSample = sample;
    let beginNewChunk = false;
    if (!track.currentChunk) {
      beginNewChunk = true;
    } else {
      let currentChunkDuration = sample.presentationTimestamp - track.currentChunk.startTimestamp;
      if (__privateGet(this, _options).fastStart === "fragmented") {
        let mostImportantTrack = __privateGet(this, _videoTrack) ?? __privateGet(this, _audioTrack);
        const chunkDuration = __privateGet(this, _options).minFragmentDuration ?? 1;
        if (track === mostImportantTrack && sample.type === "key" && currentChunkDuration >= chunkDuration) {
          beginNewChunk = true;
          __privateMethod(this, _finalizeFragment, finalizeFragment_fn).call(this);
        }
      } else {
        beginNewChunk = currentChunkDuration >= 0.5;
      }
    }
    if (beginNewChunk) {
      if (track.currentChunk) {
        __privateMethod(this, _finalizeCurrentChunk, finalizeCurrentChunk_fn).call(this, track);
      }
      track.currentChunk = {
        startTimestamp: sample.presentationTimestamp,
        samples: []
      };
    }
    track.currentChunk.samples.push(sample);
  };
  _validateTimestamp = new WeakSet();
  validateTimestamp_fn = function(presentationTimestamp, decodeTimestamp, track) {
    const strictTimestampBehavior = __privateGet(this, _options).firstTimestampBehavior === "strict";
    const noLastDecodeTimestamp = track.lastDecodeTimestamp === -1;
    const timestampNonZero = decodeTimestamp !== 0;
    if (strictTimestampBehavior && noLastDecodeTimestamp && timestampNonZero) {
      throw new Error(
        `The first chunk for your media track must have a timestamp of 0 (received DTS=${decodeTimestamp}).Non-zero first timestamps are often caused by directly piping frames or audio data from a MediaStreamTrack into the encoder. Their timestamps are typically relative to the age of thedocument, which is probably what you want.

If you want to offset all timestamps of a track such that the first one is zero, set firstTimestampBehavior: 'offset' in the options.
`
      );
    } else if (__privateGet(this, _options).firstTimestampBehavior === "offset" || __privateGet(this, _options).firstTimestampBehavior === "cross-track-offset") {
      if (track.firstDecodeTimestamp === void 0) {
        track.firstDecodeTimestamp = decodeTimestamp;
      }
      let baseDecodeTimestamp;
      if (__privateGet(this, _options).firstTimestampBehavior === "offset") {
        baseDecodeTimestamp = track.firstDecodeTimestamp;
      } else {
        baseDecodeTimestamp = Math.min(
          __privateGet(this, _videoTrack)?.firstDecodeTimestamp ?? Infinity,
          __privateGet(this, _audioTrack)?.firstDecodeTimestamp ?? Infinity
        );
      }
      decodeTimestamp -= baseDecodeTimestamp;
      presentationTimestamp -= baseDecodeTimestamp;
    }
    if (decodeTimestamp < track.lastDecodeTimestamp) {
      throw new Error(
        `Timestamps must be monotonically increasing (DTS went from ${track.lastDecodeTimestamp * 1e6} to ${decodeTimestamp * 1e6}).`
      );
    }
    track.lastDecodeTimestamp = decodeTimestamp;
    return { presentationTimestamp, decodeTimestamp };
  };
  _finalizeCurrentChunk = new WeakSet();
  finalizeCurrentChunk_fn = function(track) {
    if (__privateGet(this, _options).fastStart === "fragmented") {
      throw new Error("Can't finalize individual chunks if 'fastStart' is set to 'fragmented'.");
    }
    if (!track.currentChunk)
      return;
    track.finalizedChunks.push(track.currentChunk);
    __privateGet(this, _finalizedChunks).push(track.currentChunk);
    if (track.compactlyCodedChunkTable.length === 0 || last(track.compactlyCodedChunkTable).samplesPerChunk !== track.currentChunk.samples.length) {
      track.compactlyCodedChunkTable.push({
        firstChunk: track.finalizedChunks.length,
        // 1-indexed
        samplesPerChunk: track.currentChunk.samples.length
      });
    }
    if (__privateGet(this, _options).fastStart === "in-memory") {
      track.currentChunk.offset = 0;
      return;
    }
    track.currentChunk.offset = __privateGet(this, _writer).pos;
    for (let sample of track.currentChunk.samples) {
      __privateGet(this, _writer).write(sample.data);
      sample.data = null;
    }
    __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
  };
  _finalizeFragment = new WeakSet();
  finalizeFragment_fn = function(flushStreamingWriter = true) {
    if (__privateGet(this, _options).fastStart !== "fragmented") {
      throw new Error("Can't finalize a fragment unless 'fastStart' is set to 'fragmented'.");
    }
    let tracks = [__privateGet(this, _videoTrack), __privateGet(this, _audioTrack)].filter((track) => track && track.currentChunk);
    if (tracks.length === 0)
      return;
    let fragmentNumber = __privateWrapper(this, _nextFragmentNumber)._++;
    if (fragmentNumber === 1) {
      let movieBox = moov(tracks, __privateGet(this, _creationTime), true);
      __privateGet(this, _writer).writeBox(movieBox);
    }
    let moofOffset = __privateGet(this, _writer).pos;
    let moofBox = moof(fragmentNumber, tracks);
    __privateGet(this, _writer).writeBox(moofBox);
    {
      let mdatBox = mdat(false);
      let totalTrackSampleSize = 0;
      for (let track of tracks) {
        for (let sample of track.currentChunk.samples) {
          totalTrackSampleSize += sample.size;
        }
      }
      let mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
      if (mdatSize >= 2 ** 32) {
        mdatBox.largeSize = true;
        mdatSize = __privateGet(this, _writer).measureBox(mdatBox) + totalTrackSampleSize;
      }
      mdatBox.size = mdatSize;
      __privateGet(this, _writer).writeBox(mdatBox);
    }
    for (let track of tracks) {
      track.currentChunk.offset = __privateGet(this, _writer).pos;
      track.currentChunk.moofOffset = moofOffset;
      for (let sample of track.currentChunk.samples) {
        __privateGet(this, _writer).write(sample.data);
        sample.data = null;
      }
    }
    let endPos = __privateGet(this, _writer).pos;
    __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(moofBox));
    let newMoofBox = moof(fragmentNumber, tracks);
    __privateGet(this, _writer).writeBox(newMoofBox);
    __privateGet(this, _writer).seek(endPos);
    for (let track of tracks) {
      track.finalizedChunks.push(track.currentChunk);
      __privateGet(this, _finalizedChunks).push(track.currentChunk);
      track.currentChunk = null;
    }
    if (flushStreamingWriter) {
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    }
  };
  _maybeFlushStreamingTargetWriter = new WeakSet();
  maybeFlushStreamingTargetWriter_fn = function() {
    if (__privateGet(this, _writer) instanceof StreamTargetWriter) {
      __privateGet(this, _writer).flush();
    }
  };
  _ensureNotFinalized = new WeakSet();
  ensureNotFinalized_fn = function() {
    if (__privateGet(this, _finalized)) {
      throw new Error("Cannot add new video or audio chunks after the file has been finalized.");
    }
  };
  return __toCommonJS(src_exports);
})();
if (typeof module === "object" && typeof module.exports === "object") Object.assign(module.exports, Mp4Muxer)
;

"use strict";
var WebMMuxer = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __accessCheck = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateMethod = (obj, member, method) => {
    __accessCheck(obj, member, "access private method");
    return method;
  };

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    ArrayBufferTarget: () => ArrayBufferTarget,
    FileSystemWritableFileStreamTarget: () => FileSystemWritableFileStreamTarget,
    Muxer: () => Muxer,
    StreamTarget: () => StreamTarget,
    SubtitleEncoder: () => SubtitleEncoder
  });

  // src/ebml.ts
  var EBMLFloat32 = class {
    constructor(value) {
      this.value = value;
    }
  };
  var EBMLFloat64 = class {
    constructor(value) {
      this.value = value;
    }
  };
  var measureUnsignedInt = (value) => {
    if (value < 1 << 8) {
      return 1;
    } else if (value < 1 << 16) {
      return 2;
    } else if (value < 1 << 24) {
      return 3;
    } else if (value < 2 ** 32) {
      return 4;
    } else if (value < 2 ** 40) {
      return 5;
    } else {
      return 6;
    }
  };
  var measureEBMLVarInt = (value) => {
    if (value < (1 << 7) - 1) {
      return 1;
    } else if (value < (1 << 14) - 1) {
      return 2;
    } else if (value < (1 << 21) - 1) {
      return 3;
    } else if (value < (1 << 28) - 1) {
      return 4;
    } else if (value < 2 ** 35 - 1) {
      return 5;
    } else if (value < 2 ** 42 - 1) {
      return 6;
    } else {
      throw new Error("EBML VINT size not supported " + value);
    }
  };

  // src/misc.ts
  var readBits = (bytes, start, end) => {
    let result = 0;
    for (let i = start; i < end; i++) {
      let byteIndex = Math.floor(i / 8);
      let byte = bytes[byteIndex];
      let bitIndex = 7 - (i & 7);
      let bit = (byte & 1 << bitIndex) >> bitIndex;
      result <<= 1;
      result |= bit;
    }
    return result;
  };
  var writeBits = (bytes, start, end, value) => {
    for (let i = start; i < end; i++) {
      let byteIndex = Math.floor(i / 8);
      let byte = bytes[byteIndex];
      let bitIndex = 7 - (i & 7);
      byte &= ~(1 << bitIndex);
      byte |= (value & 1 << end - i - 1) >> end - i - 1 << bitIndex;
      bytes[byteIndex] = byte;
    }
  };

  // src/target.ts
  var isTarget = Symbol("isTarget");
  var Target = class {
  };
  isTarget;
  var ArrayBufferTarget = class extends Target {
    constructor() {
      super(...arguments);
      this.buffer = null;
    }
  };
  var StreamTarget = class extends Target {
    constructor(options) {
      super();
      this.options = options;
      if (typeof options !== "object") {
        throw new TypeError("StreamTarget requires an options object to be passed to its constructor.");
      }
      if (options.onData) {
        if (typeof options.onData !== "function") {
          throw new TypeError("options.onData, when provided, must be a function.");
        }
        if (options.onData.length < 2) {
          throw new TypeError(
            "options.onData, when provided, must be a function that takes in at least two arguments (data and position). Ignoring the position argument, which specifies the byte offset at which the data is to be written, can lead to broken outputs."
          );
        }
      }
      if (options.onHeader && typeof options.onHeader !== "function") {
        throw new TypeError("options.onHeader, when provided, must be a function.");
      }
      if (options.onCluster && typeof options.onCluster !== "function") {
        throw new TypeError("options.onCluster, when provided, must be a function.");
      }
      if (options.chunked !== void 0 && typeof options.chunked !== "boolean") {
        throw new TypeError("options.chunked, when provided, must be a boolean.");
      }
      if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize < 1024)) {
        throw new TypeError("options.chunkSize, when provided, must be an integer and not smaller than 1024.");
      }
    }
  };
  var FileSystemWritableFileStreamTarget = class extends Target {
    constructor(stream, options) {
      super();
      this.stream = stream;
      this.options = options;
      if (!(stream instanceof FileSystemWritableFileStream)) {
        throw new TypeError("FileSystemWritableFileStreamTarget requires a FileSystemWritableFileStream instance.");
      }
      if (options !== void 0 && typeof options !== "object") {
        throw new TypeError("FileSystemWritableFileStreamTarget's options, when provided, must be an object.");
      }
      if (options) {
        if (options.chunkSize !== void 0 && (!Number.isInteger(options.chunkSize) || options.chunkSize <= 0)) {
          throw new TypeError("options.chunkSize, when provided, must be a positive integer");
        }
      }
    }
  };

  // src/writer.ts
  var _helper, _helperView, _writeByte, writeByte_fn, _writeFloat32, writeFloat32_fn, _writeFloat64, writeFloat64_fn, _writeUnsignedInt, writeUnsignedInt_fn, _writeString, writeString_fn;
  var Writer = class {
    constructor() {
      __privateAdd(this, _writeByte);
      __privateAdd(this, _writeFloat32);
      __privateAdd(this, _writeFloat64);
      __privateAdd(this, _writeUnsignedInt);
      __privateAdd(this, _writeString);
      this.pos = 0;
      __privateAdd(this, _helper, new Uint8Array(8));
      __privateAdd(this, _helperView, new DataView(__privateGet(this, _helper).buffer));
      this.offsets = /* @__PURE__ */ new WeakMap();
      this.dataOffsets = /* @__PURE__ */ new WeakMap();
    }
    seek(newPos) {
      this.pos = newPos;
    }
    writeEBMLVarInt(value, width = measureEBMLVarInt(value)) {
      let pos = 0;
      switch (width) {
        case 1:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 7 | value);
          break;
        case 2:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 6 | value >> 8);
          __privateGet(this, _helperView).setUint8(pos++, value);
          break;
        case 3:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 5 | value >> 16);
          __privateGet(this, _helperView).setUint8(pos++, value >> 8);
          __privateGet(this, _helperView).setUint8(pos++, value);
          break;
        case 4:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 4 | value >> 24);
          __privateGet(this, _helperView).setUint8(pos++, value >> 16);
          __privateGet(this, _helperView).setUint8(pos++, value >> 8);
          __privateGet(this, _helperView).setUint8(pos++, value);
          break;
        case 5:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 3 | value / 2 ** 32 & 7);
          __privateGet(this, _helperView).setUint8(pos++, value >> 24);
          __privateGet(this, _helperView).setUint8(pos++, value >> 16);
          __privateGet(this, _helperView).setUint8(pos++, value >> 8);
          __privateGet(this, _helperView).setUint8(pos++, value);
          break;
        case 6:
          __privateGet(this, _helperView).setUint8(pos++, 1 << 2 | value / 2 ** 40 & 3);
          __privateGet(this, _helperView).setUint8(pos++, value / 2 ** 32 | 0);
          __privateGet(this, _helperView).setUint8(pos++, value >> 24);
          __privateGet(this, _helperView).setUint8(pos++, value >> 16);
          __privateGet(this, _helperView).setUint8(pos++, value >> 8);
          __privateGet(this, _helperView).setUint8(pos++, value);
          break;
        default:
          throw new Error("Bad EBML VINT size " + width);
      }
      this.write(__privateGet(this, _helper).subarray(0, pos));
    }
    writeEBML(data) {
      if (data === null)
        return;
      if (data instanceof Uint8Array) {
        this.write(data);
      } else if (Array.isArray(data)) {
        for (let elem of data) {
          this.writeEBML(elem);
        }
      } else {
        this.offsets.set(data, this.pos);
        __privateMethod(this, _writeUnsignedInt, writeUnsignedInt_fn).call(this, data.id);
        if (Array.isArray(data.data)) {
          let sizePos = this.pos;
          let sizeSize = data.size === -1 ? 1 : data.size ?? 4;
          if (data.size === -1) {
            __privateMethod(this, _writeByte, writeByte_fn).call(this, 255);
          } else {
            this.seek(this.pos + sizeSize);
          }
          let startPos = this.pos;
          this.dataOffsets.set(data, startPos);
          this.writeEBML(data.data);
          if (data.size !== -1) {
            let size = this.pos - startPos;
            let endPos = this.pos;
            this.seek(sizePos);
            this.writeEBMLVarInt(size, sizeSize);
            this.seek(endPos);
          }
        } else if (typeof data.data === "number") {
          let size = data.size ?? measureUnsignedInt(data.data);
          this.writeEBMLVarInt(size);
          __privateMethod(this, _writeUnsignedInt, writeUnsignedInt_fn).call(this, data.data, size);
        } else if (typeof data.data === "string") {
          this.writeEBMLVarInt(data.data.length);
          __privateMethod(this, _writeString, writeString_fn).call(this, data.data);
        } else if (data.data instanceof Uint8Array) {
          this.writeEBMLVarInt(data.data.byteLength, data.size);
          this.write(data.data);
        } else if (data.data instanceof EBMLFloat32) {
          this.writeEBMLVarInt(4);
          __privateMethod(this, _writeFloat32, writeFloat32_fn).call(this, data.data.value);
        } else if (data.data instanceof EBMLFloat64) {
          this.writeEBMLVarInt(8);
          __privateMethod(this, _writeFloat64, writeFloat64_fn).call(this, data.data.value);
        }
      }
    }
  };
  _helper = new WeakMap();
  _helperView = new WeakMap();
  _writeByte = new WeakSet();
  writeByte_fn = function(value) {
    __privateGet(this, _helperView).setUint8(0, value);
    this.write(__privateGet(this, _helper).subarray(0, 1));
  };
  _writeFloat32 = new WeakSet();
  writeFloat32_fn = function(value) {
    __privateGet(this, _helperView).setFloat32(0, value, false);
    this.write(__privateGet(this, _helper).subarray(0, 4));
  };
  _writeFloat64 = new WeakSet();
  writeFloat64_fn = function(value) {
    __privateGet(this, _helperView).setFloat64(0, value, false);
    this.write(__privateGet(this, _helper));
  };
  _writeUnsignedInt = new WeakSet();
  writeUnsignedInt_fn = function(value, width = measureUnsignedInt(value)) {
    let pos = 0;
    switch (width) {
      case 6:
        __privateGet(this, _helperView).setUint8(pos++, value / 2 ** 40 | 0);
      case 5:
        __privateGet(this, _helperView).setUint8(pos++, value / 2 ** 32 | 0);
      case 4:
        __privateGet(this, _helperView).setUint8(pos++, value >> 24);
      case 3:
        __privateGet(this, _helperView).setUint8(pos++, value >> 16);
      case 2:
        __privateGet(this, _helperView).setUint8(pos++, value >> 8);
      case 1:
        __privateGet(this, _helperView).setUint8(pos++, value);
        break;
      default:
        throw new Error("Bad UINT size " + width);
    }
    this.write(__privateGet(this, _helper).subarray(0, pos));
  };
  _writeString = new WeakSet();
  writeString_fn = function(str) {
    this.write(new Uint8Array(str.split("").map((x) => x.charCodeAt(0))));
  };
  var _target, _buffer, _bytes, _ensureSize, ensureSize_fn;
  var ArrayBufferTargetWriter = class extends Writer {
    constructor(target) {
      super();
      __privateAdd(this, _ensureSize);
      __privateAdd(this, _target, void 0);
      __privateAdd(this, _buffer, new ArrayBuffer(2 ** 16));
      __privateAdd(this, _bytes, new Uint8Array(__privateGet(this, _buffer)));
      __privateSet(this, _target, target);
    }
    write(data) {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos + data.byteLength);
      __privateGet(this, _bytes).set(data, this.pos);
      this.pos += data.byteLength;
    }
    finalize() {
      __privateMethod(this, _ensureSize, ensureSize_fn).call(this, this.pos);
      __privateGet(this, _target).buffer = __privateGet(this, _buffer).slice(0, this.pos);
    }
  };
  _target = new WeakMap();
  _buffer = new WeakMap();
  _bytes = new WeakMap();
  _ensureSize = new WeakSet();
  ensureSize_fn = function(size) {
    let newLength = __privateGet(this, _buffer).byteLength;
    while (newLength < size)
      newLength *= 2;
    if (newLength === __privateGet(this, _buffer).byteLength)
      return;
    let newBuffer = new ArrayBuffer(newLength);
    let newBytes = new Uint8Array(newBuffer);
    newBytes.set(__privateGet(this, _bytes), 0);
    __privateSet(this, _buffer, newBuffer);
    __privateSet(this, _bytes, newBytes);
  };
  var _trackingWrites, _trackedWrites, _trackedStart, _trackedEnd;
  var BaseStreamTargetWriter = class extends Writer {
    constructor(target) {
      super();
      this.target = target;
      __privateAdd(this, _trackingWrites, false);
      __privateAdd(this, _trackedWrites, void 0);
      __privateAdd(this, _trackedStart, void 0);
      __privateAdd(this, _trackedEnd, void 0);
    }
    write(data) {
      if (!__privateGet(this, _trackingWrites))
        return;
      let pos = this.pos;
      if (pos < __privateGet(this, _trackedStart)) {
        if (pos + data.byteLength <= __privateGet(this, _trackedStart))
          return;
        data = data.subarray(__privateGet(this, _trackedStart) - pos);
        pos = 0;
      }
      let neededSize = pos + data.byteLength - __privateGet(this, _trackedStart);
      let newLength = __privateGet(this, _trackedWrites).byteLength;
      while (newLength < neededSize)
        newLength *= 2;
      if (newLength !== __privateGet(this, _trackedWrites).byteLength) {
        let copy = new Uint8Array(newLength);
        copy.set(__privateGet(this, _trackedWrites), 0);
        __privateSet(this, _trackedWrites, copy);
      }
      __privateGet(this, _trackedWrites).set(data, pos - __privateGet(this, _trackedStart));
      __privateSet(this, _trackedEnd, Math.max(__privateGet(this, _trackedEnd), pos + data.byteLength));
    }
    startTrackingWrites() {
      __privateSet(this, _trackingWrites, true);
      __privateSet(this, _trackedWrites, new Uint8Array(2 ** 10));
      __privateSet(this, _trackedStart, this.pos);
      __privateSet(this, _trackedEnd, this.pos);
    }
    getTrackedWrites() {
      if (!__privateGet(this, _trackingWrites)) {
        throw new Error("Can't get tracked writes since nothing was tracked.");
      }
      let slice = __privateGet(this, _trackedWrites).subarray(0, __privateGet(this, _trackedEnd) - __privateGet(this, _trackedStart));
      let result = {
        data: slice,
        start: __privateGet(this, _trackedStart),
        end: __privateGet(this, _trackedEnd)
      };
      __privateSet(this, _trackedWrites, void 0);
      __privateSet(this, _trackingWrites, false);
      return result;
    }
  };
  _trackingWrites = new WeakMap();
  _trackedWrites = new WeakMap();
  _trackedStart = new WeakMap();
  _trackedEnd = new WeakMap();
  var DEFAULT_CHUNK_SIZE = 2 ** 24;
  var MAX_CHUNKS_AT_ONCE = 2;
  var _sections, _lastFlushEnd, _ensureMonotonicity, _chunked, _chunkSize, _chunks, _writeDataIntoChunks, writeDataIntoChunks_fn, _insertSectionIntoChunk, insertSectionIntoChunk_fn, _createChunk, createChunk_fn, _flushChunks, flushChunks_fn;
  var StreamTargetWriter = class extends BaseStreamTargetWriter {
    constructor(target, ensureMonotonicity) {
      super(target);
      __privateAdd(this, _writeDataIntoChunks);
      __privateAdd(this, _insertSectionIntoChunk);
      __privateAdd(this, _createChunk);
      __privateAdd(this, _flushChunks);
      __privateAdd(this, _sections, []);
      __privateAdd(this, _lastFlushEnd, 0);
      __privateAdd(this, _ensureMonotonicity, void 0);
      __privateAdd(this, _chunked, void 0);
      __privateAdd(this, _chunkSize, void 0);
      __privateAdd(this, _chunks, []);
      __privateSet(this, _ensureMonotonicity, ensureMonotonicity);
      __privateSet(this, _chunked, target.options?.chunked ?? false);
      __privateSet(this, _chunkSize, target.options?.chunkSize ?? DEFAULT_CHUNK_SIZE);
    }
    write(data) {
      super.write(data);
      __privateGet(this, _sections).push({
        data: data.slice(),
        start: this.pos
      });
      this.pos += data.byteLength;
    }
    flush() {
      if (__privateGet(this, _sections).length === 0)
        return;
      let chunks = [];
      let sorted = [...__privateGet(this, _sections)].sort((a, b) => a.start - b.start);
      chunks.push({
        start: sorted[0].start,
        size: sorted[0].data.byteLength
      });
      for (let i = 1; i < sorted.length; i++) {
        let lastChunk = chunks[chunks.length - 1];
        let section = sorted[i];
        if (section.start <= lastChunk.start + lastChunk.size) {
          lastChunk.size = Math.max(lastChunk.size, section.start + section.data.byteLength - lastChunk.start);
        } else {
          chunks.push({
            start: section.start,
            size: section.data.byteLength
          });
        }
      }
      for (let chunk of chunks) {
        chunk.data = new Uint8Array(chunk.size);
        for (let section of __privateGet(this, _sections)) {
          if (chunk.start <= section.start && section.start < chunk.start + chunk.size) {
            chunk.data.set(section.data, section.start - chunk.start);
          }
        }
        if (__privateGet(this, _chunked)) {
          __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, chunk.data, chunk.start);
          __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
        } else {
          if (__privateGet(this, _ensureMonotonicity) && chunk.start < __privateGet(this, _lastFlushEnd)) {
            throw new Error("Internal error: Monotonicity violation.");
          }
          this.target.options.onData?.(chunk.data, chunk.start);
          __privateSet(this, _lastFlushEnd, chunk.start + chunk.data.byteLength);
        }
      }
      __privateGet(this, _sections).length = 0;
    }
    finalize() {
      if (__privateGet(this, _chunked)) {
        __privateMethod(this, _flushChunks, flushChunks_fn).call(this, true);
      }
    }
  };
  _sections = new WeakMap();
  _lastFlushEnd = new WeakMap();
  _ensureMonotonicity = new WeakMap();
  _chunked = new WeakMap();
  _chunkSize = new WeakMap();
  _chunks = new WeakMap();
  _writeDataIntoChunks = new WeakSet();
  writeDataIntoChunks_fn = function(data, position) {
    let chunkIndex = __privateGet(this, _chunks).findIndex((x) => x.start <= position && position < x.start + __privateGet(this, _chunkSize));
    if (chunkIndex === -1)
      chunkIndex = __privateMethod(this, _createChunk, createChunk_fn).call(this, position);
    let chunk = __privateGet(this, _chunks)[chunkIndex];
    let relativePosition = position - chunk.start;
    let toWrite = data.subarray(0, Math.min(__privateGet(this, _chunkSize) - relativePosition, data.byteLength));
    chunk.data.set(toWrite, relativePosition);
    let section = {
      start: relativePosition,
      end: relativePosition + toWrite.byteLength
    };
    __privateMethod(this, _insertSectionIntoChunk, insertSectionIntoChunk_fn).call(this, chunk, section);
    if (chunk.written[0].start === 0 && chunk.written[0].end === __privateGet(this, _chunkSize)) {
      chunk.shouldFlush = true;
    }
    if (__privateGet(this, _chunks).length > MAX_CHUNKS_AT_ONCE) {
      for (let i = 0; i < __privateGet(this, _chunks).length - 1; i++) {
        __privateGet(this, _chunks)[i].shouldFlush = true;
      }
      __privateMethod(this, _flushChunks, flushChunks_fn).call(this);
    }
    if (toWrite.byteLength < data.byteLength) {
      __privateMethod(this, _writeDataIntoChunks, writeDataIntoChunks_fn).call(this, data.subarray(toWrite.byteLength), position + toWrite.byteLength);
    }
  };
  _insertSectionIntoChunk = new WeakSet();
  insertSectionIntoChunk_fn = function(chunk, section) {
    let low = 0;
    let high = chunk.written.length - 1;
    let index = -1;
    while (low <= high) {
      let mid = Math.floor(low + (high - low + 1) / 2);
      if (chunk.written[mid].start <= section.start) {
        low = mid + 1;
        index = mid;
      } else {
        high = mid - 1;
      }
    }
    chunk.written.splice(index + 1, 0, section);
    if (index === -1 || chunk.written[index].end < section.start)
      index++;
    while (index < chunk.written.length - 1 && chunk.written[index].end >= chunk.written[index + 1].start) {
      chunk.written[index].end = Math.max(chunk.written[index].end, chunk.written[index + 1].end);
      chunk.written.splice(index + 1, 1);
    }
  };
  _createChunk = new WeakSet();
  createChunk_fn = function(includesPosition) {
    let start = Math.floor(includesPosition / __privateGet(this, _chunkSize)) * __privateGet(this, _chunkSize);
    let chunk = {
      start,
      data: new Uint8Array(__privateGet(this, _chunkSize)),
      written: [],
      shouldFlush: false
    };
    __privateGet(this, _chunks).push(chunk);
    __privateGet(this, _chunks).sort((a, b) => a.start - b.start);
    return __privateGet(this, _chunks).indexOf(chunk);
  };
  _flushChunks = new WeakSet();
  flushChunks_fn = function(force = false) {
    for (let i = 0; i < __privateGet(this, _chunks).length; i++) {
      let chunk = __privateGet(this, _chunks)[i];
      if (!chunk.shouldFlush && !force)
        continue;
      for (let section of chunk.written) {
        if (__privateGet(this, _ensureMonotonicity) && chunk.start + section.start < __privateGet(this, _lastFlushEnd)) {
          throw new Error("Internal error: Monotonicity violation.");
        }
        this.target.options.onData?.(
          chunk.data.subarray(section.start, section.end),
          chunk.start + section.start
        );
        __privateSet(this, _lastFlushEnd, chunk.start + section.end);
      }
      __privateGet(this, _chunks).splice(i--, 1);
    }
  };
  var FileSystemWritableFileStreamTargetWriter = class extends StreamTargetWriter {
    constructor(target, ensureMonotonicity) {
      super(new StreamTarget({
        onData: (data, position) => target.stream.write({
          type: "write",
          data,
          position
        }),
        chunked: true,
        chunkSize: target.options?.chunkSize
      }), ensureMonotonicity);
    }
  };

  // src/muxer.ts
  var VIDEO_TRACK_NUMBER = 1;
  var AUDIO_TRACK_NUMBER = 2;
  var SUBTITLE_TRACK_NUMBER = 3;
  var VIDEO_TRACK_TYPE = 1;
  var AUDIO_TRACK_TYPE = 2;
  var SUBTITLE_TRACK_TYPE = 17;
  var MAX_CHUNK_LENGTH_MS = 2 ** 15;
  var CODEC_PRIVATE_MAX_SIZE = 2 ** 13;
  var APP_NAME = "https://github.com/Vanilagy/webm-muxer";
  var SEGMENT_SIZE_BYTES = 6;
  var CLUSTER_SIZE_BYTES = 5;
  var FIRST_TIMESTAMP_BEHAVIORS = ["strict", "offset", "permissive"];
  var _options, _writer, _segment, _segmentInfo, _seekHead, _tracksElement, _segmentDuration, _colourElement, _videoCodecPrivate, _audioCodecPrivate, _subtitleCodecPrivate, _cues, _currentCluster, _currentClusterTimestamp, _duration, _videoChunkQueue, _audioChunkQueue, _subtitleChunkQueue, _firstVideoTimestamp, _firstAudioTimestamp, _lastVideoTimestamp, _lastAudioTimestamp, _lastSubtitleTimestamp, _colorSpace, _finalized, _validateOptions, validateOptions_fn, _createFileHeader, createFileHeader_fn, _writeEBMLHeader, writeEBMLHeader_fn, _createCodecPrivatePlaceholders, createCodecPrivatePlaceholders_fn, _createColourElement, createColourElement_fn, _createSeekHead, createSeekHead_fn, _createSegmentInfo, createSegmentInfo_fn, _createTracks, createTracks_fn, _createSegment, createSegment_fn, _createCues, createCues_fn, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn, _segmentDataOffset, segmentDataOffset_get, _writeVideoDecoderConfig, writeVideoDecoderConfig_fn, _fixVP9ColorSpace, fixVP9ColorSpace_fn, _writeSubtitleChunks, writeSubtitleChunks_fn, _createInternalChunk, createInternalChunk_fn, _validateTimestamp, validateTimestamp_fn, _writeBlock, writeBlock_fn, _createCodecPrivateElement, createCodecPrivateElement_fn, _writeCodecPrivate, writeCodecPrivate_fn, _createNewCluster, createNewCluster_fn, _finalizeCurrentCluster, finalizeCurrentCluster_fn, _ensureNotFinalized, ensureNotFinalized_fn;
  var Muxer = class {
    constructor(options) {
      __privateAdd(this, _validateOptions);
      __privateAdd(this, _createFileHeader);
      __privateAdd(this, _writeEBMLHeader);
      __privateAdd(this, _createCodecPrivatePlaceholders);
      __privateAdd(this, _createColourElement);
      __privateAdd(this, _createSeekHead);
      __privateAdd(this, _createSegmentInfo);
      __privateAdd(this, _createTracks);
      __privateAdd(this, _createSegment);
      __privateAdd(this, _createCues);
      __privateAdd(this, _maybeFlushStreamingTargetWriter);
      __privateAdd(this, _segmentDataOffset);
      __privateAdd(this, _writeVideoDecoderConfig);
      __privateAdd(this, _fixVP9ColorSpace);
      __privateAdd(this, _writeSubtitleChunks);
      __privateAdd(this, _createInternalChunk);
      __privateAdd(this, _validateTimestamp);
      __privateAdd(this, _writeBlock);
      __privateAdd(this, _createCodecPrivateElement);
      __privateAdd(this, _writeCodecPrivate);
      __privateAdd(this, _createNewCluster);
      __privateAdd(this, _finalizeCurrentCluster);
      __privateAdd(this, _ensureNotFinalized);
      __privateAdd(this, _options, void 0);
      __privateAdd(this, _writer, void 0);
      __privateAdd(this, _segment, void 0);
      __privateAdd(this, _segmentInfo, void 0);
      __privateAdd(this, _seekHead, void 0);
      __privateAdd(this, _tracksElement, void 0);
      __privateAdd(this, _segmentDuration, void 0);
      __privateAdd(this, _colourElement, void 0);
      __privateAdd(this, _videoCodecPrivate, void 0);
      __privateAdd(this, _audioCodecPrivate, void 0);
      __privateAdd(this, _subtitleCodecPrivate, void 0);
      __privateAdd(this, _cues, void 0);
      __privateAdd(this, _currentCluster, void 0);
      __privateAdd(this, _currentClusterTimestamp, void 0);
      __privateAdd(this, _duration, 0);
      __privateAdd(this, _videoChunkQueue, []);
      __privateAdd(this, _audioChunkQueue, []);
      __privateAdd(this, _subtitleChunkQueue, []);
      __privateAdd(this, _firstVideoTimestamp, void 0);
      __privateAdd(this, _firstAudioTimestamp, void 0);
      __privateAdd(this, _lastVideoTimestamp, -1);
      __privateAdd(this, _lastAudioTimestamp, -1);
      __privateAdd(this, _lastSubtitleTimestamp, -1);
      __privateAdd(this, _colorSpace, void 0);
      __privateAdd(this, _finalized, false);
      __privateMethod(this, _validateOptions, validateOptions_fn).call(this, options);
      __privateSet(this, _options, {
        type: "webm",
        firstTimestampBehavior: "strict",
        ...options
      });
      this.target = options.target;
      let ensureMonotonicity = !!__privateGet(this, _options).streaming;
      if (options.target instanceof ArrayBufferTarget) {
        __privateSet(this, _writer, new ArrayBufferTargetWriter(options.target));
      } else if (options.target instanceof StreamTarget) {
        __privateSet(this, _writer, new StreamTargetWriter(options.target, ensureMonotonicity));
      } else if (options.target instanceof FileSystemWritableFileStreamTarget) {
        __privateSet(this, _writer, new FileSystemWritableFileStreamTargetWriter(options.target, ensureMonotonicity));
      } else {
        throw new Error(`Invalid target: ${options.target}`);
      }
      __privateMethod(this, _createFileHeader, createFileHeader_fn).call(this);
    }
    addVideoChunk(chunk, meta, timestamp) {
      if (!(chunk instanceof EncodedVideoChunk)) {
        throw new TypeError("addVideoChunk's first argument (chunk) must be of type EncodedVideoChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addVideoChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      let data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      this.addVideoChunkRaw(data, chunk.type, timestamp ?? chunk.timestamp, meta);
    }
    addVideoChunkRaw(data, type, timestamp, meta) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addVideoChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addVideoChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addVideoChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addVideoChunkRaw's fourth argument (meta), when provided, must be an object.");
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).video)
        throw new Error("No video track declared.");
      if (__privateGet(this, _firstVideoTimestamp) === void 0)
        __privateSet(this, _firstVideoTimestamp, timestamp);
      if (meta)
        __privateMethod(this, _writeVideoDecoderConfig, writeVideoDecoderConfig_fn).call(this, meta);
      let videoChunk = __privateMethod(this, _createInternalChunk, createInternalChunk_fn).call(this, data, type, timestamp, VIDEO_TRACK_NUMBER);
      if (__privateGet(this, _options).video.codec === "V_VP9")
        __privateMethod(this, _fixVP9ColorSpace, fixVP9ColorSpace_fn).call(this, videoChunk);
      __privateSet(this, _lastVideoTimestamp, videoChunk.timestamp);
      while (__privateGet(this, _audioChunkQueue).length > 0 && __privateGet(this, _audioChunkQueue)[0].timestamp <= videoChunk.timestamp) {
        let audioChunk = __privateGet(this, _audioChunkQueue).shift();
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, audioChunk, false);
      }
      if (!__privateGet(this, _options).audio || videoChunk.timestamp <= __privateGet(this, _lastAudioTimestamp)) {
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, videoChunk, true);
      } else {
        __privateGet(this, _videoChunkQueue).push(videoChunk);
      }
      __privateMethod(this, _writeSubtitleChunks, writeSubtitleChunks_fn).call(this);
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    }
    addAudioChunk(chunk, meta, timestamp) {
      if (!(chunk instanceof EncodedAudioChunk)) {
        throw new TypeError("addAudioChunk's first argument (chunk) must be of type EncodedAudioChunk.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunk's second argument (meta), when provided, must be an object.");
      }
      if (timestamp !== void 0 && (!Number.isFinite(timestamp) || timestamp < 0)) {
        throw new TypeError(
          "addAudioChunk's third argument (timestamp), when provided, must be a non-negative real number."
        );
      }
      let data = new Uint8Array(chunk.byteLength);
      chunk.copyTo(data);
      this.addAudioChunkRaw(data, chunk.type, timestamp ?? chunk.timestamp, meta);
    }
    addAudioChunkRaw(data, type, timestamp, meta) {
      if (!(data instanceof Uint8Array)) {
        throw new TypeError("addAudioChunkRaw's first argument (data) must be an instance of Uint8Array.");
      }
      if (type !== "key" && type !== "delta") {
        throw new TypeError("addAudioChunkRaw's second argument (type) must be either 'key' or 'delta'.");
      }
      if (!Number.isFinite(timestamp) || timestamp < 0) {
        throw new TypeError("addAudioChunkRaw's third argument (timestamp) must be a non-negative real number.");
      }
      if (meta && typeof meta !== "object") {
        throw new TypeError("addAudioChunkRaw's fourth argument (meta), when provided, must be an object.");
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).audio)
        throw new Error("No audio track declared.");
      if (__privateGet(this, _firstAudioTimestamp) === void 0)
        __privateSet(this, _firstAudioTimestamp, timestamp);
      if (meta?.decoderConfig) {
        if (__privateGet(this, _options).streaming) {
          __privateSet(this, _audioCodecPrivate, __privateMethod(this, _createCodecPrivateElement, createCodecPrivateElement_fn).call(this, meta.decoderConfig.description));
        } else {
          __privateMethod(this, _writeCodecPrivate, writeCodecPrivate_fn).call(this, __privateGet(this, _audioCodecPrivate), meta.decoderConfig.description);
        }
      }
      let audioChunk = __privateMethod(this, _createInternalChunk, createInternalChunk_fn).call(this, data, type, timestamp, AUDIO_TRACK_NUMBER);
      __privateSet(this, _lastAudioTimestamp, audioChunk.timestamp);
      while (__privateGet(this, _videoChunkQueue).length > 0 && __privateGet(this, _videoChunkQueue)[0].timestamp <= audioChunk.timestamp) {
        let videoChunk = __privateGet(this, _videoChunkQueue).shift();
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, videoChunk, true);
      }
      if (!__privateGet(this, _options).video || audioChunk.timestamp <= __privateGet(this, _lastVideoTimestamp)) {
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, audioChunk, !__privateGet(this, _options).video);
      } else {
        __privateGet(this, _audioChunkQueue).push(audioChunk);
      }
      __privateMethod(this, _writeSubtitleChunks, writeSubtitleChunks_fn).call(this);
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    }
    addSubtitleChunk(chunk, meta, timestamp) {
      if (typeof chunk !== "object" || !chunk) {
        throw new TypeError("addSubtitleChunk's first argument (chunk) must be an object.");
      } else {
        if (!(chunk.body instanceof Uint8Array)) {
          throw new TypeError("body must be an instance of Uint8Array.");
        }
        if (!Number.isFinite(chunk.timestamp) || chunk.timestamp < 0) {
          throw new TypeError("timestamp must be a non-negative real number.");
        }
        if (!Number.isFinite(chunk.duration) || chunk.duration < 0) {
          throw new TypeError("duration must be a non-negative real number.");
        }
        if (chunk.additions && !(chunk.additions instanceof Uint8Array)) {
          throw new TypeError("additions, when present, must be an instance of Uint8Array.");
        }
      }
      if (typeof meta !== "object") {
        throw new TypeError("addSubtitleChunk's second argument (meta) must be an object.");
      }
      __privateMethod(this, _ensureNotFinalized, ensureNotFinalized_fn).call(this);
      if (!__privateGet(this, _options).subtitles)
        throw new Error("No subtitle track declared.");
      if (meta?.decoderConfig) {
        if (__privateGet(this, _options).streaming) {
          __privateSet(this, _subtitleCodecPrivate, __privateMethod(this, _createCodecPrivateElement, createCodecPrivateElement_fn).call(this, meta.decoderConfig.description));
        } else {
          __privateMethod(this, _writeCodecPrivate, writeCodecPrivate_fn).call(this, __privateGet(this, _subtitleCodecPrivate), meta.decoderConfig.description);
        }
      }
      let subtitleChunk = __privateMethod(this, _createInternalChunk, createInternalChunk_fn).call(this, chunk.body, "key", timestamp ?? chunk.timestamp, SUBTITLE_TRACK_NUMBER, chunk.duration, chunk.additions);
      __privateSet(this, _lastSubtitleTimestamp, subtitleChunk.timestamp);
      __privateGet(this, _subtitleChunkQueue).push(subtitleChunk);
      __privateMethod(this, _writeSubtitleChunks, writeSubtitleChunks_fn).call(this);
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
    }
    finalize() {
      if (__privateGet(this, _finalized)) {
        throw new Error("Cannot finalize a muxer more than once.");
      }
      while (__privateGet(this, _videoChunkQueue).length > 0)
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, __privateGet(this, _videoChunkQueue).shift(), true);
      while (__privateGet(this, _audioChunkQueue).length > 0)
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, __privateGet(this, _audioChunkQueue).shift(), true);
      while (__privateGet(this, _subtitleChunkQueue).length > 0 && __privateGet(this, _subtitleChunkQueue)[0].timestamp <= __privateGet(this, _duration)) {
        __privateMethod(this, _writeBlock, writeBlock_fn).call(this, __privateGet(this, _subtitleChunkQueue).shift(), false);
      }
      if (__privateGet(this, _currentCluster)) {
        __privateMethod(this, _finalizeCurrentCluster, finalizeCurrentCluster_fn).call(this);
      }
      __privateGet(this, _writer).writeEBML(__privateGet(this, _cues));
      if (!__privateGet(this, _options).streaming) {
        let endPos = __privateGet(this, _writer).pos;
        let segmentSize = __privateGet(this, _writer).pos - __privateGet(this, _segmentDataOffset, segmentDataOffset_get);
        __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(__privateGet(this, _segment)) + 4);
        __privateGet(this, _writer).writeEBMLVarInt(segmentSize, SEGMENT_SIZE_BYTES);
        __privateGet(this, _segmentDuration).data = new EBMLFloat64(__privateGet(this, _duration));
        __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(__privateGet(this, _segmentDuration)));
        __privateGet(this, _writer).writeEBML(__privateGet(this, _segmentDuration));
        __privateGet(this, _seekHead).data[0].data[1].data = __privateGet(this, _writer).offsets.get(__privateGet(this, _cues)) - __privateGet(this, _segmentDataOffset, segmentDataOffset_get);
        __privateGet(this, _seekHead).data[1].data[1].data = __privateGet(this, _writer).offsets.get(__privateGet(this, _segmentInfo)) - __privateGet(this, _segmentDataOffset, segmentDataOffset_get);
        __privateGet(this, _seekHead).data[2].data[1].data = __privateGet(this, _writer).offsets.get(__privateGet(this, _tracksElement)) - __privateGet(this, _segmentDataOffset, segmentDataOffset_get);
        __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(__privateGet(this, _seekHead)));
        __privateGet(this, _writer).writeEBML(__privateGet(this, _seekHead));
        __privateGet(this, _writer).seek(endPos);
      }
      __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
      __privateGet(this, _writer).finalize();
      __privateSet(this, _finalized, true);
    }
  };
  _options = new WeakMap();
  _writer = new WeakMap();
  _segment = new WeakMap();
  _segmentInfo = new WeakMap();
  _seekHead = new WeakMap();
  _tracksElement = new WeakMap();
  _segmentDuration = new WeakMap();
  _colourElement = new WeakMap();
  _videoCodecPrivate = new WeakMap();
  _audioCodecPrivate = new WeakMap();
  _subtitleCodecPrivate = new WeakMap();
  _cues = new WeakMap();
  _currentCluster = new WeakMap();
  _currentClusterTimestamp = new WeakMap();
  _duration = new WeakMap();
  _videoChunkQueue = new WeakMap();
  _audioChunkQueue = new WeakMap();
  _subtitleChunkQueue = new WeakMap();
  _firstVideoTimestamp = new WeakMap();
  _firstAudioTimestamp = new WeakMap();
  _lastVideoTimestamp = new WeakMap();
  _lastAudioTimestamp = new WeakMap();
  _lastSubtitleTimestamp = new WeakMap();
  _colorSpace = new WeakMap();
  _finalized = new WeakMap();
  _validateOptions = new WeakSet();
  validateOptions_fn = function(options) {
    if (typeof options !== "object") {
      throw new TypeError("The muxer requires an options object to be passed to its constructor.");
    }
    if (!(options.target instanceof Target)) {
      throw new TypeError("The target must be provided and an instance of Target.");
    }
    if (options.video) {
      if (typeof options.video.codec !== "string") {
        throw new TypeError(`Invalid video codec: ${options.video.codec}. Must be a string.`);
      }
      if (!Number.isInteger(options.video.width) || options.video.width <= 0) {
        throw new TypeError(`Invalid video width: ${options.video.width}. Must be a positive integer.`);
      }
      if (!Number.isInteger(options.video.height) || options.video.height <= 0) {
        throw new TypeError(`Invalid video height: ${options.video.height}. Must be a positive integer.`);
      }
      if (options.video.frameRate !== void 0) {
        if (!Number.isFinite(options.video.frameRate) || options.video.frameRate <= 0) {
          throw new TypeError(
            `Invalid video frame rate: ${options.video.frameRate}. Must be a positive number.`
          );
        }
      }
      if (options.video.alpha !== void 0 && typeof options.video.alpha !== "boolean") {
        throw new TypeError(`Invalid video alpha: ${options.video.alpha}. Must be a boolean.`);
      }
    }
    if (options.audio) {
      if (typeof options.audio.codec !== "string") {
        throw new TypeError(`Invalid audio codec: ${options.audio.codec}. Must be a string.`);
      }
      if (!Number.isInteger(options.audio.numberOfChannels) || options.audio.numberOfChannels <= 0) {
        throw new TypeError(
          `Invalid number of audio channels: ${options.audio.numberOfChannels}. Must be a positive integer.`
        );
      }
      if (!Number.isInteger(options.audio.sampleRate) || options.audio.sampleRate <= 0) {
        throw new TypeError(
          `Invalid audio sample rate: ${options.audio.sampleRate}. Must be a positive integer.`
        );
      }
      if (options.audio.bitDepth !== void 0) {
        if (!Number.isInteger(options.audio.bitDepth) || options.audio.bitDepth <= 0) {
          throw new TypeError(
            `Invalid audio bit depth: ${options.audio.bitDepth}. Must be a positive integer.`
          );
        }
      }
    }
    if (options.subtitles) {
      if (typeof options.subtitles.codec !== "string") {
        throw new TypeError(`Invalid subtitles codec: ${options.subtitles.codec}. Must be a string.`);
      }
    }
    if (options.type !== void 0 && !["webm", "matroska"].includes(options.type)) {
      throw new TypeError(`Invalid type: ${options.type}. Must be 'webm' or 'matroska'.`);
    }
    if (options.firstTimestampBehavior && !FIRST_TIMESTAMP_BEHAVIORS.includes(options.firstTimestampBehavior)) {
      throw new TypeError(`Invalid first timestamp behavior: ${options.firstTimestampBehavior}`);
    }
    if (options.streaming !== void 0 && typeof options.streaming !== "boolean") {
      throw new TypeError(`Invalid streaming option: ${options.streaming}. Must be a boolean.`);
    }
  };
  _createFileHeader = new WeakSet();
  createFileHeader_fn = function() {
    if (__privateGet(this, _writer) instanceof BaseStreamTargetWriter && __privateGet(this, _writer).target.options.onHeader) {
      __privateGet(this, _writer).startTrackingWrites();
    }
    __privateMethod(this, _writeEBMLHeader, writeEBMLHeader_fn).call(this);
    if (!__privateGet(this, _options).streaming) {
      __privateMethod(this, _createSeekHead, createSeekHead_fn).call(this);
    }
    __privateMethod(this, _createSegmentInfo, createSegmentInfo_fn).call(this);
    __privateMethod(this, _createCodecPrivatePlaceholders, createCodecPrivatePlaceholders_fn).call(this);
    __privateMethod(this, _createColourElement, createColourElement_fn).call(this);
    if (!__privateGet(this, _options).streaming) {
      __privateMethod(this, _createTracks, createTracks_fn).call(this);
      __privateMethod(this, _createSegment, createSegment_fn).call(this);
    } else {
    }
    __privateMethod(this, _createCues, createCues_fn).call(this);
    __privateMethod(this, _maybeFlushStreamingTargetWriter, maybeFlushStreamingTargetWriter_fn).call(this);
  };
  _writeEBMLHeader = new WeakSet();
  writeEBMLHeader_fn = function() {
    let ebmlHeader = { id: 440786851 /* EBML */, data: [
      { id: 17030 /* EBMLVersion */, data: 1 },
      { id: 17143 /* EBMLReadVersion */, data: 1 },
      { id: 17138 /* EBMLMaxIDLength */, data: 4 },
      { id: 17139 /* EBMLMaxSizeLength */, data: 8 },
      { id: 17026 /* DocType */, data: __privateGet(this, _options).type ?? "webm" },
      { id: 17031 /* DocTypeVersion */, data: 2 },
      { id: 17029 /* DocTypeReadVersion */, data: 2 }
    ] };
    __privateGet(this, _writer).writeEBML(ebmlHeader);
  };
  _createCodecPrivatePlaceholders = new WeakSet();
  createCodecPrivatePlaceholders_fn = function() {
    __privateSet(this, _videoCodecPrivate, { id: 236 /* Void */, size: 4, data: new Uint8Array(CODEC_PRIVATE_MAX_SIZE) });
    __privateSet(this, _audioCodecPrivate, { id: 236 /* Void */, size: 4, data: new Uint8Array(CODEC_PRIVATE_MAX_SIZE) });
    __privateSet(this, _subtitleCodecPrivate, { id: 236 /* Void */, size: 4, data: new Uint8Array(CODEC_PRIVATE_MAX_SIZE) });
  };
  _createColourElement = new WeakSet();
  createColourElement_fn = function() {
    __privateSet(this, _colourElement, { id: 21936 /* Colour */, data: [
      { id: 21937 /* MatrixCoefficients */, data: 2 },
      { id: 21946 /* TransferCharacteristics */, data: 2 },
      { id: 21947 /* Primaries */, data: 2 },
      { id: 21945 /* Range */, data: 0 }
    ] });
  };
  _createSeekHead = new WeakSet();
  createSeekHead_fn = function() {
    const kaxCues = new Uint8Array([28, 83, 187, 107]);
    const kaxInfo = new Uint8Array([21, 73, 169, 102]);
    const kaxTracks = new Uint8Array([22, 84, 174, 107]);
    let seekHead = { id: 290298740 /* SeekHead */, data: [
      { id: 19899 /* Seek */, data: [
        { id: 21419 /* SeekID */, data: kaxCues },
        { id: 21420 /* SeekPosition */, size: 5, data: 0 }
      ] },
      { id: 19899 /* Seek */, data: [
        { id: 21419 /* SeekID */, data: kaxInfo },
        { id: 21420 /* SeekPosition */, size: 5, data: 0 }
      ] },
      { id: 19899 /* Seek */, data: [
        { id: 21419 /* SeekID */, data: kaxTracks },
        { id: 21420 /* SeekPosition */, size: 5, data: 0 }
      ] }
    ] };
    __privateSet(this, _seekHead, seekHead);
  };
  _createSegmentInfo = new WeakSet();
  createSegmentInfo_fn = function() {
    let segmentDuration = { id: 17545 /* Duration */, data: new EBMLFloat64(0) };
    __privateSet(this, _segmentDuration, segmentDuration);
    let segmentInfo = { id: 357149030 /* Info */, data: [
      { id: 2807729 /* TimestampScale */, data: 1e6 },
      { id: 19840 /* MuxingApp */, data: APP_NAME },
      { id: 22337 /* WritingApp */, data: APP_NAME },
      !__privateGet(this, _options).streaming ? segmentDuration : null
    ] };
    __privateSet(this, _segmentInfo, segmentInfo);
  };
  _createTracks = new WeakSet();
  createTracks_fn = function() {
    let tracksElement = { id: 374648427 /* Tracks */, data: [] };
    __privateSet(this, _tracksElement, tracksElement);
    if (__privateGet(this, _options).video) {
      tracksElement.data.push({ id: 174 /* TrackEntry */, data: [
        { id: 215 /* TrackNumber */, data: VIDEO_TRACK_NUMBER },
        { id: 29637 /* TrackUID */, data: VIDEO_TRACK_NUMBER },
        { id: 131 /* TrackType */, data: VIDEO_TRACK_TYPE },
        { id: 134 /* CodecID */, data: __privateGet(this, _options).video.codec },
        __privateGet(this, _videoCodecPrivate),
        __privateGet(this, _options).video.frameRate ? { id: 2352003 /* DefaultDuration */, data: 1e9 / __privateGet(this, _options).video.frameRate } : null,
        { id: 224 /* Video */, data: [
          { id: 176 /* PixelWidth */, data: __privateGet(this, _options).video.width },
          { id: 186 /* PixelHeight */, data: __privateGet(this, _options).video.height },
          __privateGet(this, _options).video.alpha ? { id: 21440 /* AlphaMode */, data: 1 } : null,
          __privateGet(this, _colourElement)
        ] }
      ] });
    }
    if (__privateGet(this, _options).audio) {
      __privateSet(this, _audioCodecPrivate, __privateGet(this, _options).streaming ? __privateGet(this, _audioCodecPrivate) || null : { id: 236 /* Void */, size: 4, data: new Uint8Array(CODEC_PRIVATE_MAX_SIZE) });
      tracksElement.data.push({ id: 174 /* TrackEntry */, data: [
        { id: 215 /* TrackNumber */, data: AUDIO_TRACK_NUMBER },
        { id: 29637 /* TrackUID */, data: AUDIO_TRACK_NUMBER },
        { id: 131 /* TrackType */, data: AUDIO_TRACK_TYPE },
        { id: 134 /* CodecID */, data: __privateGet(this, _options).audio.codec },
        __privateGet(this, _audioCodecPrivate),
        { id: 225 /* Audio */, data: [
          { id: 181 /* SamplingFrequency */, data: new EBMLFloat32(__privateGet(this, _options).audio.sampleRate) },
          { id: 159 /* Channels */, data: __privateGet(this, _options).audio.numberOfChannels },
          __privateGet(this, _options).audio.bitDepth ? { id: 25188 /* BitDepth */, data: __privateGet(this, _options).audio.bitDepth } : null
        ] }
      ] });
    }
    if (__privateGet(this, _options).subtitles) {
      tracksElement.data.push({ id: 174 /* TrackEntry */, data: [
        { id: 215 /* TrackNumber */, data: SUBTITLE_TRACK_NUMBER },
        { id: 29637 /* TrackUID */, data: SUBTITLE_TRACK_NUMBER },
        { id: 131 /* TrackType */, data: SUBTITLE_TRACK_TYPE },
        { id: 134 /* CodecID */, data: __privateGet(this, _options).subtitles.codec },
        __privateGet(this, _subtitleCodecPrivate)
      ] });
    }
  };
  _createSegment = new WeakSet();
  createSegment_fn = function() {
    let segment = {
      id: 408125543 /* Segment */,
      size: __privateGet(this, _options).streaming ? -1 : SEGMENT_SIZE_BYTES,
      data: [
        !__privateGet(this, _options).streaming ? __privateGet(this, _seekHead) : null,
        __privateGet(this, _segmentInfo),
        __privateGet(this, _tracksElement)
      ]
    };
    __privateSet(this, _segment, segment);
    __privateGet(this, _writer).writeEBML(segment);
    if (__privateGet(this, _writer) instanceof BaseStreamTargetWriter && __privateGet(this, _writer).target.options.onHeader) {
      let { data, start } = __privateGet(this, _writer).getTrackedWrites();
      __privateGet(this, _writer).target.options.onHeader(data, start);
    }
  };
  _createCues = new WeakSet();
  createCues_fn = function() {
    __privateSet(this, _cues, { id: 475249515 /* Cues */, data: [] });
  };
  _maybeFlushStreamingTargetWriter = new WeakSet();
  maybeFlushStreamingTargetWriter_fn = function() {
    if (__privateGet(this, _writer) instanceof StreamTargetWriter) {
      __privateGet(this, _writer).flush();
    }
  };
  _segmentDataOffset = new WeakSet();
  segmentDataOffset_get = function() {
    return __privateGet(this, _writer).dataOffsets.get(__privateGet(this, _segment));
  };
  _writeVideoDecoderConfig = new WeakSet();
  writeVideoDecoderConfig_fn = function(meta) {
    if (!meta.decoderConfig)
      return;
    if (meta.decoderConfig.colorSpace) {
      let colorSpace = meta.decoderConfig.colorSpace;
      __privateSet(this, _colorSpace, colorSpace);
      __privateGet(this, _colourElement).data = [
        { id: 21937 /* MatrixCoefficients */, data: {
          "rgb": 1,
          "bt709": 1,
          "bt470bg": 5,
          "smpte170m": 6
        }[colorSpace.matrix] },
        { id: 21946 /* TransferCharacteristics */, data: {
          "bt709": 1,
          "smpte170m": 6,
          "iec61966-2-1": 13
        }[colorSpace.transfer] },
        { id: 21947 /* Primaries */, data: {
          "bt709": 1,
          "bt470bg": 5,
          "smpte170m": 6
        }[colorSpace.primaries] },
        { id: 21945 /* Range */, data: [1, 2][Number(colorSpace.fullRange)] }
      ];
      if (!__privateGet(this, _options).streaming) {
        let endPos = __privateGet(this, _writer).pos;
        __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(__privateGet(this, _colourElement)));
        __privateGet(this, _writer).writeEBML(__privateGet(this, _colourElement));
        __privateGet(this, _writer).seek(endPos);
      }
    }
    if (meta.decoderConfig.description) {
      if (__privateGet(this, _options).streaming) {
        __privateSet(this, _videoCodecPrivate, __privateMethod(this, _createCodecPrivateElement, createCodecPrivateElement_fn).call(this, meta.decoderConfig.description));
      } else {
        __privateMethod(this, _writeCodecPrivate, writeCodecPrivate_fn).call(this, __privateGet(this, _videoCodecPrivate), meta.decoderConfig.description);
      }
    }
  };
  _fixVP9ColorSpace = new WeakSet();
  fixVP9ColorSpace_fn = function(chunk) {
    if (chunk.type !== "key")
      return;
    if (!__privateGet(this, _colorSpace))
      return;
    let i = 0;
    if (readBits(chunk.data, 0, 2) !== 2)
      return;
    i += 2;
    let profile = (readBits(chunk.data, i + 1, i + 2) << 1) + readBits(chunk.data, i + 0, i + 1);
    i += 2;
    if (profile === 3)
      i++;
    let showExistingFrame = readBits(chunk.data, i + 0, i + 1);
    i++;
    if (showExistingFrame)
      return;
    let frameType = readBits(chunk.data, i + 0, i + 1);
    i++;
    if (frameType !== 0)
      return;
    i += 2;
    let syncCode = readBits(chunk.data, i + 0, i + 24);
    i += 24;
    if (syncCode !== 4817730)
      return;
    if (profile >= 2)
      i++;
    let colorSpaceID = {
      "rgb": 7,
      "bt709": 2,
      "bt470bg": 1,
      "smpte170m": 3
    }[__privateGet(this, _colorSpace).matrix];
    writeBits(chunk.data, i + 0, i + 3, colorSpaceID);
  };
  _writeSubtitleChunks = new WeakSet();
  writeSubtitleChunks_fn = function() {
    let lastWrittenMediaTimestamp = Math.min(
      __privateGet(this, _options).video ? __privateGet(this, _lastVideoTimestamp) : Infinity,
      __privateGet(this, _options).audio ? __privateGet(this, _lastAudioTimestamp) : Infinity
    );
    let queue = __privateGet(this, _subtitleChunkQueue);
    while (queue.length > 0 && queue[0].timestamp <= lastWrittenMediaTimestamp) {
      __privateMethod(this, _writeBlock, writeBlock_fn).call(this, queue.shift(), !__privateGet(this, _options).video && !__privateGet(this, _options).audio);
    }
  };
  _createInternalChunk = new WeakSet();
  createInternalChunk_fn = function(data, type, timestamp, trackNumber, duration, additions) {
    let adjustedTimestamp = __privateMethod(this, _validateTimestamp, validateTimestamp_fn).call(this, timestamp, trackNumber);
    let internalChunk = {
      data,
      additions,
      type,
      timestamp: adjustedTimestamp,
      duration,
      trackNumber
    };
    return internalChunk;
  };
  _validateTimestamp = new WeakSet();
  validateTimestamp_fn = function(timestamp, trackNumber) {
    let lastTimestamp = trackNumber === VIDEO_TRACK_NUMBER ? __privateGet(this, _lastVideoTimestamp) : trackNumber === AUDIO_TRACK_NUMBER ? __privateGet(this, _lastAudioTimestamp) : __privateGet(this, _lastSubtitleTimestamp);
    if (trackNumber !== SUBTITLE_TRACK_NUMBER) {
      let firstTimestamp = trackNumber === VIDEO_TRACK_NUMBER ? __privateGet(this, _firstVideoTimestamp) : __privateGet(this, _firstAudioTimestamp);
      if (__privateGet(this, _options).firstTimestampBehavior === "strict" && lastTimestamp === -1 && timestamp !== 0) {
        throw new Error(
          `The first chunk for your media track must have a timestamp of 0 (received ${timestamp}). Non-zero first timestamps are often caused by directly piping frames or audio data from a MediaStreamTrack into the encoder. Their timestamps are typically relative to the age of the document, which is probably what you want.

If you want to offset all timestamps of a track such that the first one is zero, set firstTimestampBehavior: 'offset' in the options.
If you want to allow non-zero first timestamps, set firstTimestampBehavior: 'permissive'.
`
        );
      } else if (__privateGet(this, _options).firstTimestampBehavior === "offset") {
        timestamp -= firstTimestamp;
      }
    }
    if (timestamp < lastTimestamp) {
      throw new Error(
        `Timestamps must be monotonically increasing (went from ${lastTimestamp} to ${timestamp}).`
      );
    }
    if (timestamp < 0) {
      throw new Error(`Timestamps must be non-negative (received ${timestamp}).`);
    }
    return timestamp;
  };
  _writeBlock = new WeakSet();
  writeBlock_fn = function(chunk, canCreateNewCluster) {
    if (__privateGet(this, _options).streaming && !__privateGet(this, _tracksElement)) {
      __privateMethod(this, _createTracks, createTracks_fn).call(this);
      __privateMethod(this, _createSegment, createSegment_fn).call(this);
    }
    let msTimestamp = Math.floor(chunk.timestamp / 1e3);
    let relativeTimestamp = msTimestamp - __privateGet(this, _currentClusterTimestamp);
    let shouldCreateNewClusterFromKeyFrame = canCreateNewCluster && chunk.type === "key" && relativeTimestamp >= 1e3;
    let clusterWouldBeTooLong = relativeTimestamp >= MAX_CHUNK_LENGTH_MS;
    if (!__privateGet(this, _currentCluster) || shouldCreateNewClusterFromKeyFrame || clusterWouldBeTooLong) {
      __privateMethod(this, _createNewCluster, createNewCluster_fn).call(this, msTimestamp);
      relativeTimestamp = 0;
    }
    if (relativeTimestamp < 0) {
      return;
    }
    let prelude = new Uint8Array(4);
    let view = new DataView(prelude.buffer);
    view.setUint8(0, 128 | chunk.trackNumber);
    view.setInt16(1, relativeTimestamp, false);
    if (chunk.duration === void 0 && !chunk.additions) {
      view.setUint8(3, Number(chunk.type === "key") << 7);
      let simpleBlock = { id: 163 /* SimpleBlock */, data: [
        prelude,
        chunk.data
      ] };
      __privateGet(this, _writer).writeEBML(simpleBlock);
    } else {
      let msDuration = Math.floor(chunk.duration / 1e3);
      let blockGroup = { id: 160 /* BlockGroup */, data: [
        { id: 161 /* Block */, data: [
          prelude,
          chunk.data
        ] },
        chunk.duration !== void 0 ? { id: 155 /* BlockDuration */, data: msDuration } : null,
        chunk.additions ? { id: 30113 /* BlockAdditions */, data: chunk.additions } : null
      ] };
      __privateGet(this, _writer).writeEBML(blockGroup);
    }
    __privateSet(this, _duration, Math.max(__privateGet(this, _duration), msTimestamp));
  };
  _createCodecPrivateElement = new WeakSet();
  createCodecPrivateElement_fn = function(data) {
    return { id: 25506 /* CodecPrivate */, size: 4, data: new Uint8Array(data) };
  };
  _writeCodecPrivate = new WeakSet();
  writeCodecPrivate_fn = function(element, data) {
    let endPos = __privateGet(this, _writer).pos;
    __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(element));
    let codecPrivateElementSize = 2 + 4 + data.byteLength;
    let voidDataSize = CODEC_PRIVATE_MAX_SIZE - codecPrivateElementSize;
    if (voidDataSize < 0) {
      let newByteLength = data.byteLength + voidDataSize;
      if (data instanceof ArrayBuffer) {
        data = data.slice(0, newByteLength);
      } else {
        data = data.buffer.slice(0, newByteLength);
      }
      voidDataSize = 0;
    }
    element = [
      __privateMethod(this, _createCodecPrivateElement, createCodecPrivateElement_fn).call(this, data),
      { id: 236 /* Void */, size: 4, data: new Uint8Array(voidDataSize) }
    ];
    __privateGet(this, _writer).writeEBML(element);
    __privateGet(this, _writer).seek(endPos);
  };
  _createNewCluster = new WeakSet();
  createNewCluster_fn = function(timestamp) {
    if (__privateGet(this, _currentCluster)) {
      __privateMethod(this, _finalizeCurrentCluster, finalizeCurrentCluster_fn).call(this);
    }
    if (__privateGet(this, _writer) instanceof BaseStreamTargetWriter && __privateGet(this, _writer).target.options.onCluster) {
      __privateGet(this, _writer).startTrackingWrites();
    }
    __privateSet(this, _currentCluster, {
      id: 524531317 /* Cluster */,
      size: __privateGet(this, _options).streaming ? -1 : CLUSTER_SIZE_BYTES,
      data: [
        { id: 231 /* Timestamp */, data: timestamp }
      ]
    });
    __privateGet(this, _writer).writeEBML(__privateGet(this, _currentCluster));
    __privateSet(this, _currentClusterTimestamp, timestamp);
    let clusterOffsetFromSegment = __privateGet(this, _writer).offsets.get(__privateGet(this, _currentCluster)) - __privateGet(this, _segmentDataOffset, segmentDataOffset_get);
    __privateGet(this, _cues).data.push({ id: 187 /* CuePoint */, data: [
      { id: 179 /* CueTime */, data: timestamp },
      __privateGet(this, _options).video ? { id: 183 /* CueTrackPositions */, data: [
        { id: 247 /* CueTrack */, data: VIDEO_TRACK_NUMBER },
        { id: 241 /* CueClusterPosition */, data: clusterOffsetFromSegment }
      ] } : null,
      __privateGet(this, _options).audio ? { id: 183 /* CueTrackPositions */, data: [
        { id: 247 /* CueTrack */, data: AUDIO_TRACK_NUMBER },
        { id: 241 /* CueClusterPosition */, data: clusterOffsetFromSegment }
      ] } : null
    ] });
  };
  _finalizeCurrentCluster = new WeakSet();
  finalizeCurrentCluster_fn = function() {
    if (!__privateGet(this, _options).streaming) {
      let clusterSize = __privateGet(this, _writer).pos - __privateGet(this, _writer).dataOffsets.get(__privateGet(this, _currentCluster));
      let endPos = __privateGet(this, _writer).pos;
      __privateGet(this, _writer).seek(__privateGet(this, _writer).offsets.get(__privateGet(this, _currentCluster)) + 4);
      __privateGet(this, _writer).writeEBMLVarInt(clusterSize, CLUSTER_SIZE_BYTES);
      __privateGet(this, _writer).seek(endPos);
    }
    if (__privateGet(this, _writer) instanceof BaseStreamTargetWriter && __privateGet(this, _writer).target.options.onCluster) {
      let { data, start } = __privateGet(this, _writer).getTrackedWrites();
      __privateGet(this, _writer).target.options.onCluster(data, start, __privateGet(this, _currentClusterTimestamp));
    }
  };
  _ensureNotFinalized = new WeakSet();
  ensureNotFinalized_fn = function() {
    if (__privateGet(this, _finalized)) {
      throw new Error("Cannot add new video or audio chunks after the file has been finalized.");
    }
  };

  // src/subtitles.ts
  var cueBlockHeaderRegex = /(?:(.+?)\n)?((?:\d{2}:)?\d{2}:\d{2}.\d{3})\s+-->\s+((?:\d{2}:)?\d{2}:\d{2}.\d{3})/g;
  var preambleStartRegex = /^WEBVTT.*?\n{2}/;
  var timestampRegex = /(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})/;
  var inlineTimestampRegex = /<(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})>/g;
  var textEncoder = new TextEncoder();
  var _options2, _config, _preambleSeen, _preambleBytes, _preambleEmitted, _parseTimestamp, parseTimestamp_fn, _formatTimestamp, formatTimestamp_fn;
  var SubtitleEncoder = class {
    constructor(options) {
      __privateAdd(this, _parseTimestamp);
      __privateAdd(this, _formatTimestamp);
      __privateAdd(this, _options2, void 0);
      __privateAdd(this, _config, void 0);
      __privateAdd(this, _preambleSeen, false);
      __privateAdd(this, _preambleBytes, void 0);
      __privateAdd(this, _preambleEmitted, false);
      __privateSet(this, _options2, options);
    }
    configure(config) {
      if (config.codec !== "webvtt") {
        throw new Error("Codec must be 'webvtt'.");
      }
      __privateSet(this, _config, config);
    }
    encode(text) {
      if (!__privateGet(this, _config)) {
        throw new Error("Encoder not configured.");
      }
      text = text.replace("\r\n", "\n").replace("\r", "\n");
      cueBlockHeaderRegex.lastIndex = 0;
      let match;
      if (!__privateGet(this, _preambleSeen)) {
        if (!preambleStartRegex.test(text)) {
          let error = new Error("WebVTT preamble incorrect.");
          __privateGet(this, _options2).error(error);
          throw error;
        }
        match = cueBlockHeaderRegex.exec(text);
        let preamble = text.slice(0, match?.index ?? text.length).trimEnd();
        if (!preamble) {
          let error = new Error("No WebVTT preamble provided.");
          __privateGet(this, _options2).error(error);
          throw error;
        }
        __privateSet(this, _preambleBytes, textEncoder.encode(preamble));
        __privateSet(this, _preambleSeen, true);
        if (match) {
          text = text.slice(match.index);
          cueBlockHeaderRegex.lastIndex = 0;
        }
      }
      while (match = cueBlockHeaderRegex.exec(text)) {
        let notes = text.slice(0, match.index);
        let cueIdentifier = match[1] || "";
        let matchEnd = match.index + match[0].length;
        let bodyStart = text.indexOf("\n", matchEnd) + 1;
        let cueSettings = text.slice(matchEnd, bodyStart).trim();
        let bodyEnd = text.indexOf("\n\n", matchEnd);
        if (bodyEnd === -1)
          bodyEnd = text.length;
        let startTime = __privateMethod(this, _parseTimestamp, parseTimestamp_fn).call(this, match[2]);
        let endTime = __privateMethod(this, _parseTimestamp, parseTimestamp_fn).call(this, match[3]);
        let duration = endTime - startTime;
        let body = text.slice(bodyStart, bodyEnd);
        let additions = `${cueSettings}
${cueIdentifier}
${notes}`;
        inlineTimestampRegex.lastIndex = 0;
        body = body.replace(inlineTimestampRegex, (match2) => {
          let time = __privateMethod(this, _parseTimestamp, parseTimestamp_fn).call(this, match2.slice(1, -1));
          let offsetTime = time - startTime;
          return `<${__privateMethod(this, _formatTimestamp, formatTimestamp_fn).call(this, offsetTime)}>`;
        });
        text = text.slice(bodyEnd).trimStart();
        cueBlockHeaderRegex.lastIndex = 0;
        let chunk = {
          body: textEncoder.encode(body),
          additions: additions.trim() === "" ? void 0 : textEncoder.encode(additions),
          timestamp: startTime * 1e3,
          duration: duration * 1e3
        };
        let meta = {};
        if (!__privateGet(this, _preambleEmitted)) {
          meta.decoderConfig = {
            description: __privateGet(this, _preambleBytes)
          };
          __privateSet(this, _preambleEmitted, true);
        }
        __privateGet(this, _options2).output(chunk, meta);
      }
    }
  };
  _options2 = new WeakMap();
  _config = new WeakMap();
  _preambleSeen = new WeakMap();
  _preambleBytes = new WeakMap();
  _preambleEmitted = new WeakMap();
  _parseTimestamp = new WeakSet();
  parseTimestamp_fn = function(string) {
    let match = timestampRegex.exec(string);
    if (!match)
      throw new Error("Expected match.");
    return 60 * 60 * 1e3 * Number(match[1] || "0") + 60 * 1e3 * Number(match[2]) + 1e3 * Number(match[3]) + Number(match[4]);
  };
  _formatTimestamp = new WeakSet();
  formatTimestamp_fn = function(timestamp) {
    let hours = Math.floor(timestamp / (60 * 60 * 1e3));
    let minutes = Math.floor(timestamp % (60 * 60 * 1e3) / (60 * 1e3));
    let seconds = Math.floor(timestamp % (60 * 1e3) / 1e3);
    let milliseconds = timestamp % 1e3;
    return hours.toString().padStart(2, "0") + ":" + minutes.toString().padStart(2, "0") + ":" + seconds.toString().padStart(2, "0") + "." + milliseconds.toString().padStart(3, "0");
  };
  return __toCommonJS(src_exports);
})();
if (typeof module === "object" && typeof module.exports === "object") Object.assign(module.exports, WebMMuxer)
;

/* ===== Writing the file ===================================================

   THE BUG THIS EXISTS TO FIX. The Studio recorded by handing canvas frames
   to a MediaRecorder, which timestamps every frame by the wall clock at the
   moment it arrives. Rendering a 1080×1920 frame and encoding it takes
   longer than a thirtieth of a second, so the file came out as long as the
   ENCODING took rather than as long as the reel was built for. Measured: a
   reel asked for four seconds arrived as 11.7; asked for eight, 24.9; at
   full size, four seconds became 16.7. Every export was three to four times
   too long and played at seven to ten frames a second. The frame-rate
   control did nothing at all.

   Nothing caught it because nothing had ever opened one of the files and
   read its duration back.

   WHAT REPLACES IT. WebCodecs lets a frame carry an explicit timestamp, so
   frame n is stamped at n/fps seconds whether it took one millisecond to
   draw or four hundred. The duration of the file is then a property of the
   reel rather than of the machine, which is the only way it can be correct
   on a fast Mac and a slow one alike. A muxer writes the chunks into a
   container; both are vendored, because this site fetches nothing.

   AND WHY IT IS BUILT FOR AUDIO FROM THE START. A voice track is the next
   thing that goes in here, and audio has to be sample-accurate against the
   picture. Under the old recorder that was impossible in principle: audio
   records in real time and the video did not. Under explicit timestamps
   both tracks are placed on the same clock and sync is a property of the
   arithmetic rather than a race. The audio path is wired now, so adding a
   voice later is wiring rather than surgery.

   THE FALLBACK IS KEPT. A browser without WebCodecs still records the old
   way and still gets a file; it just gets the old behaviour with it, and
   the Studio says so rather than pretending. */

(function () {
  "use strict";

  function has() {
    return typeof VideoEncoder !== "undefined" &&
           typeof VideoFrame !== "undefined" &&
           (typeof window.Mp4Muxer !== "undefined" ||
            typeof window.WebMMuxer !== "undefined");
  }

  /* ---- what this machine can actually write ------------------------------
     Asked rather than assumed: Chrome on macOS encodes H.264 and AAC, the
     headless Linux build used by the harness has neither and does VP9 and
     Opus instead. The same code has to produce a correct file on both, so
     the format is chosen by interrogation. H.264 in MP4 is preferred
     because it is what a phone, a television and Instagram all accept;
     WebM is a correct file that some of those will refuse. */
  function probeCodec(list, kind, width, height) {
    var chain = Promise.resolve(null);
    list.forEach(function (c) {
      chain = chain.then(function (found) {
        if (found) return found;
        var cfg = kind === "video"
          ? { codec: c.codec, width: width, height: height,
              bitrate: c.bitrate, framerate: 30 }
          : { codec: c.codec, sampleRate: 48000, numberOfChannels: 1,
              bitrate: 128000 };
        var E = kind === "video" ? VideoEncoder : AudioEncoder;
        if (typeof E === "undefined") return null;
        return E.isConfigSupported(cfg).then(function (s) {
          return s && s.supported ? c : null;
        }, function () { return null; });
      });
    });
    return chain;
  }

  function plan(width, height, quality, wantAudio) {
    var bits = Math.round((quality || 1) * 12000000);
    var V = [
      { codec: "avc1.640028", container: "mp4", bitrate: bits, name: "H.264 High" },
      { codec: "avc1.4d4028", container: "mp4", bitrate: bits, name: "H.264 Main" },
      { codec: "avc1.42e01e", container: "mp4", bitrate: bits, name: "H.264 Baseline" },
      { codec: "vp09.00.10.08", container: "webm", bitrate: bits, name: "VP9" },
      { codec: "vp8", container: "webm", bitrate: bits, name: "VP8" }
    ];
    return probeCodec(V, "video", width, height).then(function (v) {
      if (!v) return null;
      var A = v.container === "mp4"
        ? [{ codec: "mp4a.40.2", name: "AAC" }, { codec: "opus", name: "Opus" }]
        : [{ codec: "opus", name: "Opus" }];
      /* a container has to agree with its audio codec: Opus in MP4 is legal
         but widely unplayed, so an MP4 without AAC ships silent rather than
         unplayable, and the caller is told which it got */
      return probeCodec(A, "audio").then(function (a) {
        if (v.container === "mp4" && a && a.codec !== "mp4a.40.2") a = null;
        var mp4Plan = { video: v, audio: a, container: v.container,
                        mime: v.container === "mp4" ? "video/mp4" : "video/webm" };
        /* A VOICE THAT WAS ADDED IS NOT DROPPED TO KEEP A CONTAINER.
           MP4 without AAC ships silent, which is the right call for a reel
           with no voice — and the wrong one for a reel someone recorded a
           voice for. A browser with H.264 but no AAC (Chromium on Linux, as
           of late 2026) took the MP4 branch and wrote every voiced reel MUTE;
           voice-verify.mjs found it, by decoding the export and finding no
           track. So when there is audio to carry and MP4 cannot carry it
           playably, WebM with Opus is chosen instead: a correct, voiced file
           beats a widely playable silent one. */
        if (!wantAudio || v.container !== "mp4" || a) return mp4Plan;
        var W = V.filter(function (x) { return x.container === "webm"; });
        return probeCodec(W, "video", width, height).then(function (vw) {
          if (!vw) return mp4Plan;
          return probeCodec([{ codec: "opus", name: "Opus" }], "audio").then(function (ao) {
            if (!ao) return mp4Plan;
            return { video: vw, audio: ao, container: "webm", mime: "video/webm",
                     reason: "this browser cannot write AAC, so the voiced reel is WebM (VP9/Opus) rather than a silent MP4" };
          });
        });
      });
    });
  }

  function muxerFor(p, fps) {
    var common = { video: { codec: null, width: 0, height: 0 } };
    void common;
    if (p.container === "mp4") {
      if (typeof window.Mp4Muxer === "undefined") return null;
      return { kind: "mp4", lib: window.Mp4Muxer, fps: fps };
    }
    if (typeof window.WebMMuxer === "undefined") return null;
    return { kind: "webm", lib: window.WebMMuxer, fps: fps };
  }

  /* ---- the run -----------------------------------------------------------
     drawAt(p) paints the canvas at playhead p; everything else is this
     file's business. `audio` is an optional AudioBuffer laid on the same
     clock, starting at zero. */
  function encode(canvas, opts) {
    var seconds = Math.max(0.2, opts.seconds || 10);
    var fps = Math.max(5, Math.min(60, Math.round(opts.fps || 30)));
    var drawAt = opts.drawAt, onProgress = opts.onProgress;
    var W = canvas.width, H = canvas.height;
    var total = Math.max(2, Math.round(seconds * fps));
    var job = { cancel: false };
    JOB = job;

    return plan(W, H, opts.quality, !!opts.audio).then(function (p) {
      if (!p) throw new Error("this browser cannot encode video");
      var M = muxerFor(p, fps);
      if (!M) throw new Error("no muxer for " + p.container);

      var target = new M.lib.ArrayBufferTarget();
      var cfg = {
        target: target,
        video: { codec: p.container === "mp4" ? "avc" : "V_VP9",
                 width: W, height: H, frameRate: fps },
        fastStart: p.container === "mp4" ? "in-memory" : undefined
      };
      if (p.container === "webm") cfg.video.codec = p.video.codec === "vp8" ? "V_VP8" : "V_VP9";
      if (p.audio && opts.audio)
        cfg.audio = { codec: p.container === "mp4" ? "aac" : "A_OPUS",
                      sampleRate: 48000,
                      numberOfChannels: opts.audio.numberOfChannels || 1 };
      var muxer = new M.lib.Muxer(cfg);

      var err = null;
      var venc = new VideoEncoder({
        output: function (chunk, meta) { muxer.addVideoChunk(chunk, meta); },
        error: function (e) { err = e; }
      });
      venc.configure({ codec: p.video.codec, width: W, height: H,
                       bitrate: p.video.bitrate, framerate: fps,
                       latencyMode: "quality" });

      /* ---- the picture ---------------------------------------------------
         One frame per tick, stamped at n/fps in microseconds. The encoder's
         queue is drained periodically rather than never, because a few
         hundred un-flushed frames at full size is hundreds of megabytes of
         live VideoFrames and the tab dies without saying why. */
      var i = 0;
      function step() {
        return new Promise(function (resolve, reject) {
          function tick() {
            if (err) { reject(err); return; }
            if (job.cancel || i >= total) { resolve(); return; }
            /* drawAt may return a promise — a surface drawn in SVG has to
               be rasterised through an image load first. A plain return
               keeps the old synchronous path exactly as it was. */
            var drawn;
            try { drawn = drawAt(i / total); } catch (e) { reject(e); return; }
            if (drawn && typeof drawn.then === "function") drawn.then(emit, reject);
            else emit();
          }
          function emit() {
            if (err) { reject(err); return; }
            try {
              var frame = new VideoFrame(canvas, {
                timestamp: Math.round(i * 1e6 / fps),
                duration: Math.round(1e6 / fps)
              });
              /* a keyframe every two seconds: a reel is scrubbed and
                 thumbnailed, and a file whose only keyframe is the first
                 frame seeks like treacle */
              venc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
              frame.close();
            } catch (e) { reject(e); return; }
            i++;
            if (onProgress) onProgress(i / total * 0.92);
            if (venc.encodeQueueSize > 12) {
              /* let the encoder catch up rather than queueing the world */
              setTimeout(tick, 8);
            } else setTimeout(tick, 0);
          }
          tick();
        });
      }

      return step().then(function () {
        if (job.cancel) { try { venc.close(); } catch (e) {} return null; }
        return venc.flush().then(function () { venc.close(); });
      }).then(function (stopped) {
        if (stopped === null) return null;
        if (!(p.audio && opts.audio)) return null;
        return addAudio(muxer, opts.audio, p, seconds);
      }).then(function (stopped) {
        if (job.cancel) { JOB = null; return { cancelled: true }; }
        void stopped;
        muxer.finalize();
        JOB = null;
        if (onProgress) onProgress(1);
        return {
          blob: new Blob([target.buffer], { type: p.mime }),
          mime: p.mime,
          container: p.container,
          codec: p.video.name,
          audioCodec: (p.audio && opts.audio) ? p.audio.name : null,
          /* why the container is not the preferred one, when it is not */
          reason: p.reason || null,
          seconds: seconds, fps: fps, frames: total,
          exact: true, cancelled: false
        };
      });
    });
  }

  /* ---- the voice ---------------------------------------------------------
     An AudioBuffer encoded against the same clock the frames are on, in
     chunks of a fifth of a second. Nothing here knows or cares where the
     buffer came from — a file, a recording, a model running locally — which
     is the point of putting it behind one argument. */
  function addAudio(muxer, buffer, p, seconds) {
    if (typeof AudioEncoder === "undefined") return Promise.resolve(null);
    var ch = Math.min(2, buffer.numberOfChannels || 1);
    var rate = 48000;
    var err = null;
    var aenc = new AudioEncoder({
      output: function (chunk, meta) { muxer.addAudioChunk(chunk, meta); },
      error: function (e) { err = e; }
    });
    aenc.configure({ codec: p.audio.codec, sampleRate: rate,
                     numberOfChannels: ch, bitrate: 128000 });
    /* resampled if it has to be, and never longer than the picture: a voice
       that outruns the reel leaves a file that is audio-only at the end */
    return resample(buffer, rate, ch, seconds).then(function (data) {
      var frames = data.length / ch;
      var CH = Math.round(rate / 5), at = 0;
      while (at < frames) {
        var n = Math.min(CH, frames - at);
        var slice = data.subarray(at * ch, (at + n) * ch);
        aenc.encode(new AudioData({
          format: "f32", sampleRate: rate, numberOfFrames: n,
          numberOfChannels: ch,
          timestamp: Math.round(at * 1e6 / rate),
          data: slice
        }));
        at += n;
      }
      return aenc.flush().then(function () { aenc.close(); });
    });
  }

  function resample(buffer, rate, ch, seconds) {
    var want = Math.round(Math.min(seconds, buffer.duration) * rate);
    if (typeof OfflineAudioContext === "undefined")
      return Promise.resolve(interleave(buffer, ch, Math.min(want, buffer.length)));
    if (buffer.sampleRate === rate)
      return Promise.resolve(interleave(buffer, ch, Math.min(want, buffer.length)));
    var off = new OfflineAudioContext(ch, want, rate);
    var src = off.createBufferSource();
    src.buffer = buffer;
    src.connect(off.destination);
    src.start();
    return off.startRendering().then(function (out) {
      return interleave(out, ch, out.length);
    });
  }
  function interleave(buffer, ch, n) {
    var out = new Float32Array(n * ch), c, k;
    for (c = 0; c < ch; c++) {
      var src = buffer.getChannelData(Math.min(c, buffer.numberOfChannels - 1));
      for (k = 0; k < n; k++) out[k * ch + c] = src[k] || 0;
    }
    return out;
  }

  var JOB = null;
  function cancel() { if (JOB) JOB.cancel = true; }
  function busy() { return !!JOB; }

  window.SPEncode = { has: has, plan: plan, encode: encode,
                      cancel: cancel, busy: busy };
})();
;

/* ===== The script and caption generator ==================================

   A reel is only half of a post. The other half is what gets said over it
   and what gets pasted under it, and writing those by hand for a hundred
   and twenty-six reels is how a series dies after four episodes.

   So this generates both, in three languages, from the numbers the reel
   actually computed.

   THE RULE THAT KEEPS IT HONEST: the script renders the reel's own FACTS,
   not a second set of sentences about the same subject. A reel publishes a
   small bag of what it measured — the boundary degrees, the star and its
   longitude, how many fell inside, the pāda signs, the daśā lord — and each
   language is a template over that bag. There is no copy of the numbers
   anywhere in here, so a script cannot drift from the picture it is read
   over. English goes further and uses the reel's own beat sentences
   verbatim, because those are already written and already checked.

   WHY THE TIMINGS ARE MEASURED. A script that says "read this in four
   seconds" is useless if the beat lasts two. Each beat's duration is taken
   from the timeline by bisection — the playhead window over which that beat
   is the current one — so the teleprompter is timed to the reel as built,
   including the deceleration into holds. A line too long for its beat is
   flagged rather than quietly left for the recording to expose.

   ON THE THIRTY-SIX POINTS. Yoni, gaṇa and nāḍī are later tradition, not
   BPHS, and the caption says so. What is claimed is arithmetic and nothing
   else: of the thirty-six, twenty-one are fixed by the birth star alone.
   No compatibility verdict about any person is produced here. */

(function () {
  "use strict";

  var LANGS = [
    { key: "hinglish", label: "Hinglish", rtl: false },
    { key: "hi", label: "हिंदी", rtl: false },
    { key: "en", label: "English", rtl: false }
  ];

  /* ---- how long each beat is actually on screen --------------------------
     Bisection against the timeline rather than seconds ÷ beats: holds cost
     time, the lead and tail cost time, and a warped clock spends them
     unevenly on purpose. */
  function beatTimes(reel) {
    var R = window.SPReel, tl = reel && reel.tl;
    if (!R || !tl || !reel.events || !reel.events.length) return [];
    var n = reel.events.length, S = tl.seconds;
    function idxAt(p) {
      var t = R.clockAt(tl, p).t, k = -1;
      for (var i = 0; i < n; i++) if (reel.events[i].t <= t) k = i; else break;
      return k;
    }
    /* the first playhead at which each beat is current */
    var starts = new Array(n), i;
    for (i = 0; i < n; i++) {
      var lo = 0, hi = 1;
      if (idxAt(1) < i) { starts[i] = null; continue; }
      for (var b = 0; b < 42; b++) {
        var m = (lo + hi) / 2;
        if (idxAt(m) < i) lo = m; else hi = m;
      }
      starts[i] = hi;
    }
    /* WHICH BEATS A NARRATOR ACTUALLY READS.

       An explainer has seven events and all seven are beats. An eclipse
       reel has two hundred and forty-seven, one per syzygy, and asking for
       a line over each of them produced a fifteen-minute script for a
       thirty-four-second reel. Nobody narrates a reel that way: they read
       the moments it stops at and the two cards at either end, and let the
       rest run under them.

       So a reel with more events than a viewer could register is narrated
       on its HELD events — the ones the clock already decelerates into —
       plus the first and the last. A short reel is narrated on all of
       them, which is what it always was. */
    var keep = [];
    if (n <= 12) {
      for (i = 0; i < n; i++) keep.push(i);
    } else {
      keep.push(0);
      for (i = 0; i < n; i++)
        if (reel.events[i].hold && keep.indexOf(i) < 0) keep.push(i);
      if (keep.indexOf(n - 1) < 0) keep.push(n - 1);
      keep.sort(function (a, b) { return a - b; });
    }
    /* THE FIRST LINE STARTS AT ZERO. The clock has not begun during the
       lead — the title card is up and no event is current yet — but the
       narrator has: that is exactly when the first sentence is spoken. So
       the first window runs from the top of the reel rather than from the
       moment the first event arrives, which is also what makes the windows
       tile the whole length instead of leaving the lead unaccounted. */
    var out = [], first = true;
    for (var q = 0; q < keep.length; q++) {
      i = keep[q];
      if (starts[i] == null) continue;
      if (first) { starts[i] = 0; first = false; }
      var nextI = null;
      for (var j = q + 1; j < keep.length; j++)
        if (starts[keep[j]] != null) { nextI = keep[j]; break; }
      var end = nextI == null ? 1 : starts[nextI];
      out.push({ i: i, from: starts[i] * S, to: end * S,
                 secs: Math.max(0, (end - starts[i]) * S) });
    }
    return out;
  }

  /* ---- the same names in Devanāgarī --------------------------------------

     A Hindi script with "Meṣa" and "Mūla" in Latin letters in the middle of
     it defeats the one reason to narrate from Devanāgarī at all: a Hindi
     voice reading Devanāgarī gets every Sanskrit term right by
     construction, and the same voice reading IAST mangles all of them.

     COPIED FROM 49-motion-lang.js rather than retyped, so the reels, the
     animations and the pages cannot drift from one another. */
  var DEV = {
    rasi: ["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुम्भ","मीन"],
    nak: ["अश्विनी","भरणी","कृत्तिका","रोहिणी","मृगशिरा","आर्द्रा","पुनर्वसु","पुष्य","आश्लेषा","मघा","पूर्वा फाल्गुनी","उत्तरा फाल्गुनी","हस्त","चित्रा","स्वाती","विशाखा","अनुराधा","ज्येष्ठा","मूल","पूर्वाषाढा","उत्तराषाढा","श्रवण","धनिष्ठा","शतभिषा","पूर्व भाद्रपद","उत्तर भाद्रपद","रेवती"],
    graha: {Sun:"सूर्य",Moon:"चन्द्र",Mars:"मंगल",Mercury:"बुध",Jupiter:"गुरु",Venus:"शुक्र",Saturn:"शनि",Rahu:"राहु",Ketu:"केतु"}
  };
  /* IAST to Devanāgarī for the handful of names the templates substitute */
  var DEV_OF = {};
  (function () {
    var EN_RASI = ["Meṣa","Vṛṣabha","Mithuna","Karka","Siṃha","Kanyā",
                   "Tulā","Vṛścika","Dhanus","Makara","Kumbha","Mīna"];
    var EN_GRAHA = {"Sūrya":"Sun","Candra":"Moon","Maṅgala":"Mars",
                    "Budha":"Mercury","Guru":"Jupiter","Śukra":"Venus",
                    "Śani":"Saturn","Rāhu":"Rahu","Ketu":"Ketu"};
    EN_RASI.forEach(function (n, i) { DEV_OF[n] = DEV.rasi[i]; });
    Object.keys(EN_GRAHA).forEach(function (n) {
      DEV_OF[n] = DEV.graha[EN_GRAHA[n]];
    });
  })();
  /* the bhāva names themselves: Sanskrit either way, so this is spelling
     rather than translation, and a Hindi voice needs the Devanāgarī to say
     "Āyus" and "Kalatra" as Sanskrit rather than as English */
  ["Tanu","Dhana","Sahaja","Sukha","Putra","Ripu","Kalatra","Āyus",
   "Bhāgya","Karma","Lābha","Vyaya"].forEach(function (n, i) {
    DEV_OF[n] = ["तनु","धन","सहज","सुख","पुत्र","रिपु","कलत्र","आयु",
                 "भाग्य","कर्म","लाभ","व्यय"][i];
  });

  function dev(name) { return DEV_OF[name] || name; }
  /* elements, modalities and spans in Hindi. The reel's own figures are
     English strings built for the caption band; a Hindi line carrying
     "fire, dual" and "20.2 months" is half-translated, which reads worse
     than either language on its own. These render from the numbers in the
     facts rather than from those strings. */
  /* The twelve bhāvas in Hindi. The significations are the same ones the
     English template carries, translated — not a different reading of the
     houses. A Hindi line that says "Karma — action. Ye sambhalta hai:
     profession, status, authority" is not a Hindi line, and the whole point
     of narrating from this tab is that a Hindi voice says the Sanskrit
     correctly. */
  var HI_CLASS = {
    "Kendra": "केन्द्र", "Trikoṇa": "त्रिकोण", "Panaphara": "पणफर",
    "Āpoklima": "आपोक्लिम", "Upacaya": "उपचय", "Dusthāna": "दुःस्थान",
    "Māraka": "मारक"
  };
  var HI_BHAVA = {
    1:  { lit: "शरीर", kw: "शरीर, रूप, ओज, स्वभाव, बुद्धि, यश — सम्पूर्ण जीवन",
          ka: "लग्नेश, तथा सूर्य" },
    2:  { lit: "धन", kw: "संचित धन, कुटुम्ब, भोजन, वाणी, मुख — और एक मारक भाव",
          ka: "गुरु" },
    3:  { lit: "साथ जन्मा", kw: "पराक्रम, छोटे भाई-बहन, हाथ, संवाद, लघु यात्रा, प्रयास",
          ka: "मंगल" },
    4:  { lit: "सुख", kw: "माता, गृह, भूमि, वाहन, शिक्षा, आंतरिक शान्ति, विषयों का अन्त",
          ka: "चन्द्र, तथा शिक्षा के लिए बुध" },
    5:  { lit: "संतान", kw: "संतान, बुद्धि, मन्त्र और मनोबल, प्रेम, सट्टा, पूर्व पुण्य",
          ka: "गुरु" },
    6:  { lit: "शत्रु", kw: "शत्रु, रोग, ऋण, वाद-विवाद, सेवा, प्रतिस्पर्धा",
          ka: "मंगल और शनि" },
    7:  { lit: "जीवनसाथी", kw: "जीवनसाथी, विवाह, साझेदारी, व्यापार, विदेश-निवास",
          ka: "शुक्र" },
    8:  { lit: "आयु", kw: "आयु, उलट-फेर, जीर्ण रोग, उत्तराधिकार और दूसरों का धन, गुप्त विषय",
          ka: "शनि" },
    9:  { lit: "भाग्य", kw: "भाग्य, धर्म, पिता, गुरु, उच्च विद्या, तीर्थ, दीर्घ यात्रा",
          ka: "गुरु, तथा पिता के लिए सूर्य" },
    10: { lit: "कार्य", kw: "आजीविका, प्रतिष्ठा, अधिकार, कर्म, कीर्ति, शासन",
          ka: "सूर्य, बुध, गुरु और शनि — चारों मिलकर" },
    11: { lit: "लाभ", kw: "लाभ, आय, बड़े भाई-बहन, सम्पर्क, पूर्ण हुई आशाएँ",
          ka: "गुरु" },
    12: { lit: "व्यय", kw: "व्यय, हानि, विदेश, एकान्त, चरण, मोक्ष",
          ka: "शनि, तथा शयन-सुख के लिए शुक्र" }
  };

  var HI_ELEM = { fire: "अग्नि", earth: "पृथ्वी", air: "वायु", water: "जल" };
  var HI_MODE = { movable: "चर", fixed: "स्थिर", dual: "द्विस्वभाव" };
  function hiB(F, k) {
    var r = HI_BHAVA[F.num];
    if (r && r[k]) return r[k];
    return k === "lit" ? F.lit : (k === "kw" ? F.keywords : F.karaka);
  }

  function hiSpan(d) {
    if (d == null) return "—";
    if (d < 3) {
      var h = Math.round(d * 24), dd = Math.floor(h / 24);
      return dd ? dd + " दिन " + (h % 24) + " घंटे" : h + " घंटे";
    }
    if (d < 70) return Math.round(d) + " दिन";
    var mo = d / 30.44;
    if (mo < 22) return mo.toFixed(1) + " माह";
    return (d / 365.2564).toFixed(1) + " वर्ष";
  }
  function hiMins(m) {
    if (m == null) return "—";
    var h = Math.floor(m / 60), r = Math.round(m % 60);
    return h ? h + " घंटे " + r + " मिनट" : r + " मिनट";
  }

  /* the nakṣatra names are published for the story builders, which know the
     index but not this table */
  try { window.MO_DEV_NAK = DEV.nak; } catch (e) {}
  function devList(a) { return a.map(dev); }

  /* ---- the words ---------------------------------------------------------
     One function per language per subject, each a template over the facts.
     A missing template falls through to the generic frame rather than to an
     empty string, so every reel in the Studio produces something readable. */

  function padaList(F, sep) {
    return F.padas.join(sep || " · ");
  }

  var T = {
    nakshatra: {
      hinglish: function (F) {
        return [
          F.num + ". " + F.name + " — seema " + F.loTxt + " se " + F.hiTxt +
            ", nirayan bhog. Ye rahi woh patti aasman ki, seedhi kholkar.",
          "Do sunehri lakeeron ke beech poora 13°20' ka khaana — pehle " +
            F.prev + ", baad me " + F.next + ".",
          "Ab asli taare. Is patti mein " + F.inWin + " taare hain, magnitude " +
            "5.4 tak, kranti-vritt se " + F.latLim.toFixed(0) + "° ke andar.",
          F.inside
            ? "Jis taare ke naam par ye khaana hai — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — wo apne hi khaane " +
              "ke andar hai. " + F.inArc + " taare " + F.inWin + " me se andar."
            : "Lekin jis taare ke naam par ye khaana hai — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — wo apne khaane se " +
              F.offTxt + " bahar hai. 27 me se 7 ke saath yehi hota hai.",
          "Chaar pada, har ek 3°20' — jo bilkul ek navamsha hai. Inke " +
            "navamsha: " + padaList(F) + ".",
          "Rashi se ye " + F.rashi + " me baithta hai" +
            (F.rashi2 ? " aur " + F.rashi2 + " tak jaata hai." : "."),
          "Dasha ka swami " + F.lord + " — " + F.lordYears + " saal ki " +
            "mahadasha, jitni bachi ho utni. Stellarium kholkar khud jaanch " +
            "lijiye."
        ];
      },
      hi: function (F) {
        return [
          F.num + ". " + (F.nakDev || F.name) + " — सीमा " + F.loTxt + " से " + F.hiTxt +
            ", निरयण भोग। यह रही आकाश की वह पट्टी, सीधी खोलकर।",
          "दो सुनहरी रेखाओं के बीच पूरा 13°20' का खाना — पहले " +
            (F.prevDev || F.prev) + ", बाद में " + (F.nextDev || F.next) + "।",
          "अब असली तारे। इस पट्टी में " + F.inWin + " तारे हैं, कांति " +
            "5.4 तक, क्रांतिवृत्त से " + F.latLim.toFixed(0) + "° के भीतर।",
          F.inside
            ? "जिस तारे के नाम पर यह खाना है — " + F.star + ", " + F.bayer +
              ", " + F.starLon.toFixed(2) + "° — वह अपने ही खाने के भीतर है। " +
              F.inWin + " में से " + F.inArc + " भीतर।"
            : "परन्तु जिस तारे के नाम पर यह खाना है — " + F.star + ", " +
              F.bayer + ", " + F.starLon.toFixed(2) + "° — वह अपने खाने से " +
              F.offTxt + " बाहर है। सत्ताईस में से सात के साथ यही है।",
          "चार पाद, प्रत्येक 3°20' — जो ठीक एक नवांश है। इनके नवांश: " +
            devList(F.padas).join(" · ") + "।",
          "राशि से यह " + dev(F.rashi) + " में पड़ता है" +
            (F.rashi2 ? " और " + dev(F.rashi2) + " तक जाता है।" : "।"),
          "दशा का स्वामी " + dev(F.lord) + " — " + F.lordYears + " वर्ष की महादशा, " +
            "जितनी शेष हो उतनी। Stellarium में स्वयं जाँच लीजिए।"
        ];
      }
    },

    rashi: {
      hinglish: function (F) {
        var c = F.cross;
        return [
          F.num + ". " + F.name + " — " + F.lo + "° se " + F.hi +
            "°, tees degree. Yahi patti hai, seedhi kholkar.",
          "Is window me " + F.inWin + " taare hain; " + F.inArc + " " +
            F.name + " ke andar.",
          "Tees degree matlab sawa do nakshatra — isliye dono system kabhi " +
            "nahi milte. " + F.naksWhole + " poore andar, " + F.naksCut +
            " kinaare se kate hue.",
          F.name + " ka swami " + F.lord + ", tatva " + F.elem + ", " +
            F.mode + " rashi.",
          "Har graha ise paar karne me kitna leta hai — naapa hua, pehle " +
            "pravesh se aakhri nikas tak: " +
            c.map(function (q) { return q.name + " " + q.txt; }).join(", ") + ".",
          F.riseTxt
            ? F.name + " ko udit hone me " + F.riseTxt + " lagte hain " +
              (F.place ? F.place + " par" : "") + " — do ghante nahi. " +
              "Akshansh badalte hi ye badal jaata hai."
            : "Udit hone ka samay jagah par nirbhar karta hai."
        ];
      },
      hi: function (F) {
        var c = F.cross;
        return [
          F.num + ". " + dev(F.name) + " — " + F.lo + "° से " + F.hi +
            "°, तीस अंश। यही पट्टी है, सीधी खोलकर।",
          "इस खिड़की में " + F.inWin + " तारे हैं; " + F.inArc + " " +
            dev(F.name) + " के भीतर।",
          "तीस अंश अर्थात् सवा दो नक्षत्र — इसीलिए दोनों व्यवस्थाएँ कभी नहीं मिलतीं। " +
            F.naksWhole + " पूरे भीतर, " + F.naksCut + " किनारों से कटे।",
          dev(F.name) + " का स्वामी " + dev(F.lord) + ", तत्व " +
            (HI_ELEM[F.elem] || F.elem) + ", " +
            (HI_MODE[F.mode] || F.mode) + " राशि।",
          "प्रत्येक ग्रह इसे पार करने में कितना लेता है — मापा हुआ, प्रथम प्रवेश से " +
            "अंतिम निकास तक: " +
            c.map(function (q) { return dev(q.name) + " " + hiSpan(q.days); })
             .join(", ") + "।",
          F.riseTxt
            ? dev(F.name) + " को उदित होने में " + hiMins(F.riseMin) + " लगते हैं" +
              (F.place ? " (" + F.place + ")" : "") + " — दो घंटे नहीं।"
            : "उदय काल स्थान पर निर्भर है।"
        ];
      }
    },

    bhava: {
      hinglish: function (F) {
        return [
          "Bhava matlab zindagi ka ek maidan, Lagna se gina hua. Baarah " +
            "bhava poora anubhav dhak lete hain.",
          F.num + ". " + F.name + " — " + F.lit + ". Lagna se " + F.from +
            "° par shuru, " + F.to + "° tak.",
          "Ye sambhalta hai: " + F.keywords + ".",
          "Varg se ye " + F.classes.join(" aur ") + " hai.",
          "Iska karaka — swabhavik suchak — " + F.karaka + ".",
          "Iska swami jahan bhi jaaye, ye maamle saath le jaata hai.",
          "Koi bhava akela nahi padha jaata. Swami ki haalat, baithe hue " +
            "grah, drishti aur dasha — sab milkar tay karte hain."
        ];
      },
      hi: function (F) {
        return [
          "भाव अर्थात् जीवन का एक क्षेत्र, लग्न से गिना हुआ। बारह भाव सम्पूर्ण अनुभव को ढक लेते हैं।",
          F.num + ". " + dev(F.name) + " — " + hiB(F, "lit") + "। लग्न से " +
            F.from + "° पर आरम्भ, " + F.to + "° तक।",
          "यह सँभालता है: " + hiB(F, "kw") + "।",
          "वर्ग से यह " +
            F.classes.map(function (c) { return HI_CLASS[c] || c; })
             .join(" और ") + " है।",
          "इसका कारक — स्वाभाविक सूचक — " + hiB(F, "ka") + "।",
          "इसका स्वामी जहाँ भी जाए, ये विषय साथ ले जाता है।",
          "कोई भाव अकेले नहीं पढ़ा जाता। स्वामी की स्थिति, बैठे ग्रह, दृष्टि और दशा — " +
            "सब मिलकर तय करते हैं।"
        ];
      }
    }
  };

  /* the generic frame: used for every reel that has no bespoke template,
     which is most of them. It says what the reel is and what the beat is
     about, in the right register, rather than nothing. */
  function generic(reel, lang) {
    return reel.events.map(function (e, i) {
      var lab = String(e.big || "").toLowerCase();
      if (lang === "hi")
        return (i === 0 ? reel.title + " — " + reel.subtitle + " " : "") +
               (e.small || lab);
      if (lang === "hinglish")
        return (i === 0 ? reel.title + " — dekhiye. " : "") + (e.small || lab);
      return e.small || lab;
    });
  }

  function lines(reel, lang) {
    if (lang === "en")
      return reel.events.map(function (e) { return e.small || e.big || ""; });
    var F = reel.facts;
    var fam = F && T[F.kind] && T[F.kind][lang];
    if (!fam) return generic(reel, lang);
    var out;
    try { out = fam(F); } catch (e2) { out = null; }
    if (!out || !out.length) return generic(reel, lang);
    /* a template may be written for more or fewer beats than the reel has;
       the reel is the authority on how many there are */
    var n = reel.events.length, res = [];
    for (var i = 0; i < n; i++) res.push(out[i] != null ? out[i] : out[out.length - 1]);
    return res;
  }

  /* ---- how fast a line can be read --------------------------------------
     Measured in syllables rather than characters, because Devanāgarī sets
     far fewer characters for the same utterance and a character count would
     call every Hindi line short. A comfortable read-aloud pace is about
     four syllables a second; the vowel count is a decent proxy. */
  function syllables(s, lang) {
    if (lang === "hi") {
      /* A Devanāgarī syllable is a consonant with its vowel: a bare
         consonant carries the inherent 'a' and counts, one followed by a
         virāma is half of a conjunct and does not, and an independent vowel
         counts on its own. A mātrā rides on a consonant that has already
         been counted, so counting those as well doubles every syllable that
         has one — which is what made the Hindi lines read half again as
         long as they are. A Hindi script also carries Latin fragments: star
         names, Bayer letters, Stellarium. Those are counted the Latin way
         in the same pass, because they are spoken too. */
      var cons = (s.match(/[क-हक़-य़](?![्])/g) || []).length;
      var ind = (s.match(/[अ-औ]/g) || []).length;
      var lat = (s.match(/[aeiouāīūṛēō]+/gi) || []).length;
      return cons + ind + lat;
    }
    return (s.match(/[aeiouāīūṛēō]+/gi) || []).length;
  }
  function readSecs(s, lang) { return syllables(s, lang) / 4.0; }

  /* ---- text a speech engine can actually read ---------------------------

     The teleprompter is for a human eye: it carries the beat number and the
     seconds that beat is on screen, because that is what tells you how fast
     to read. Paste that into a text-to-speech engine and it dutifully says
     "one, four point seven seconds" before every line.

     It is not only the timings. A reel's own notation is written for a
     reader and is hostile to a voice:

       13°20′      read as "thirteen twenty", or silently dropped
       λ Sco       the Greek letter skipped entirely
       Jyeṣṭhā     the diacritics mangled or spelt out
       —  ·        no pause where the sentence wants one

     So this is a second rendering of the same lines with nothing in it that
     is not meant to be said. The degrees are spoken, the Greek letters are
     named, and the Sanskrit is respelt phonetically — for the Latin scripts
     only. The Devanāgarī one is left alone, because a Hindi voice reading
     Devanāgarī gets every one of those terms right by construction, which
     is the whole reason that script is the one to narrate from. */

  var GREEK_SAY = {
    "α": "alpha", "β": "beta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
    "ζ": "zeta", "η": "eta", "θ": "theta", "ι": "iota", "κ": "kappa",
    "λ": "lambda", "μ": "mu", "ν": "nu", "ξ": "xi", "ο": "omicron",
    "π": "pi", "ρ": "rho", "σ": "sigma", "τ": "tau", "υ": "upsilon",
    "φ": "phi", "χ": "chi", "ψ": "psi", "ω": "omega",
    "¹": " one", "²": " two", "³": " three", "⁴": " four", "⁵": " five"
  };

  /* IAST to something an Indian-English voice says correctly. The rules are
     character-level and safe, because every one of these characters is
     non-ASCII and so appears only in a Sanskrit term — "catalogue" cannot
     be caught by them. The one rule that is NOT safe is c → ch, which is
     right for Sanskrit (Candra is "Chandra") and wrong for English, so it
     is applied only to words that carry a diacritic, plus a short list of
     Sanskrit words that happen not to. */
  var IAST_SAY = [
    [/ṝ/g, "ree"], [/ṛ/g, "ri"], [/ḹ/g, "lree"], [/ḷ/g, "lri"],
    [/ā/g, "aa"], [/ī/g, "ee"], [/ū/g, "oo"], [/ē/g, "e"], [/ō/g, "o"],
    [/ṅ/g, "ng"], [/ñ/g, "ny"], [/ṇ/g, "n"], [/ṃ/g, "n"], [/ṁ/g, "n"],
    [/ś/g, "sh"], [/ṣ/g, "sh"], [/ṭ/g, "t"], [/ḍ/g, "d"], [/ḥ/g, "h"],
    [/Ṝ/g, "Ree"], [/Ṛ/g, "Ri"], [/Ā/g, "Aa"], [/Ī/g, "Ee"], [/Ū/g, "Oo"],
    [/Ṅ/g, "Ng"], [/Ñ/g, "Ny"], [/Ṇ/g, "N"], [/Ṃ/g, "N"],
    [/Ś/g, "Sh"], [/Ṣ/g, "Sh"], [/Ṭ/g, "T"], [/Ḍ/g, "D"]
  ];
  var DIACRITIC = /[āīūṛṝḷḹṅñṇṃṁśṣṭḍḥĀĪŪṚṜṄÑṆṂŚṢṬḌ]/;
  /* Sanskrit words with no diacritic to mark them, where c is still "ch" */
  var SAY_C = /^(Candra|Caitra|Caturtha|Citra|Cara)/;

  function sayWord(w) {
    var had = DIACRITIC.test(w) || SAY_C.test(w);
    var out = w;
    IAST_SAY.forEach(function (r) { out = out.replace(r[0], r[1]); });
    if (had) {
      out = out.replace(/jñ/g, "gy").replace(/Jñ/g, "Gy");
      out = out.replace(/c/g, "ch").replace(/C/g, "Ch");
      out = out.replace(/chh/g, "ch").replace(/Chh/g, "Ch");
    }
    /* "Jyeshthaa" and "mahaadashaa" are right but clumsy; a word-final
       double a is the one place the doubling buys nothing, because a voice
       lengthens a final a anyway */
    out = out.replace(/aa\b/g, "a");
    return out;
  }

  function sayDegrees(t, lang) {
    var deg = lang === "hi" ? " अंश" : " degrees";
    var min = lang === "hi" ? " कला" : " minutes";
    /* 253°20′ → 253 degrees 20 minutes; 240°00′ → 240 degrees, because
       "zero minutes" is noise nobody says out loud */
    t = t.replace(/(\d+)°\s*0{1,2}['′]/g, "$1" + deg);
    t = t.replace(/(\d+)°\s*(\d+)['′]/g, "$1" + deg + " $2" + min);
    t = t.replace(/(\d+(?:\.\d+)?)°/g, "$1" + deg);
    return t;
  }

  /* "2 d 11 h" is a caption band's abbreviation: it fits where "2 days 11
     hours" would not, and a voice reads it out as the letters dee and aitch.
     The number before each one decides the plural, and a unit that is
     already a word is left alone. */
  /* A Bayer designation is written "β Ari" and read "beta Arietis": the
     letter belongs to the constellation, so the constellation is spoken in
     the genitive. Left as the three-letter abbreviation a voice says "airy"
     for Ari and "sko" for Sco, which is not a star name in any language.
     Only the constellations the star list actually reaches are here; an
     abbreviation this table does not know is left alone rather than
     guessed at. */
  var CONSTEL_SAY = {
    Ari: "Arietis", Tau: "Tauri", Ori: "Orionis", Gem: "Geminorum",
    Hya: "Hydrae", Leo: "Leonis", Crv: "Corvi", Vir: "Virginis",
    Boo: "Bo\u00f6tis", Lib: "Librae", Sco: "Scorpii", Sgr: "Sagittarii",
    Aql: "Aquilae", Del: "Delphini", Aqr: "Aquarii", Peg: "Pegasi",
    Psc: "Piscium", Cnc: "Cancri", Cap: "Capricorni", Oph: "Ophiuchi",
    Sct: "Scuti", Cet: "Ceti", Eri: "Eridani", CMa: "Canis Majoris",
    CMi: "Canis Minoris", Lup: "Lupi", Crt: "Crateris", Sex: "Sextantis"
  };
  function sayStars(t) {
    return t.replace(/\b([A-Z][A-Za-z]{2})\b/g, function (all, a) {
      return CONSTEL_SAY[a] || all;
    });
  }

  var UNIT_SAY = {
    en: { d: ["day", "days"], h: ["hour", "hours"], m: ["minute", "minutes"],
          s: ["second", "seconds"], y: ["year", "years"] },
    hi: { d: ["दिन", "दिन"], h: ["घंटा", "घंटे"], m: ["मिनट", "मिनट"],
          s: ["सेकंड", "सेकंड"], y: ["वर्ष", "वर्ष"] }
  };
  function sayUnits(t, lang) {
    var tab = UNIT_SAY[lang === "hi" ? "hi" : "en"];
    return t.replace(/(\d+(?:\.\d+)?)\s*([dhmsy])\b(?!['’])/g,
      function (all, n, u) {
        var w = tab[u];
        if (!w) return all;
        return n + " " + (parseFloat(n) === 1 ? w[0] : w[1]);
      });
  }

  function speakable(line, lang) {
    var t = line;
    t = sayDegrees(t, lang);
    t = sayUnits(t, lang);
    t = sayStars(t);
    Object.keys(GREEK_SAY).forEach(function (g) {
      t = t.split(g).join(GREEK_SAY[g]);
    });
    if (lang !== "hi")
      t = t.replace(/[^\s,.;:!?()"'—·]+/g, sayWord);
    /* punctuation that is a pause when read and a mark when seen */
    /* a minus sign is a word when spoken; the hyphen that joins two words
       is not, so only one in front of a number is touched */
    t = t.replace(/[\u2212-]\s*(?=\d)/g, lang === "hi" ? "\u090b\u0923 " : "minus ");
    t = t.replace(/\s*[—–]\s*/g, ", ");
    t = t.replace(/\s*·\s*/g, ", ");
    t = t.replace(/\s*:\s*/g, ": ");
    t = t.replace(/\s{2,}/g, " ").trim();
    /* a line always ends in something that makes the voice stop */
    if (!/[.!?।]$/.test(t)) t += ".";
    return t;
  }

  /* the whole reel as one block of speech: one paragraph per beat, nothing
     else, ready to paste into a phone's dictation shortcut */
  function speech(reel, lang) {
    var r = render(reel, lang);
    if (!r) return "";
    return r.beats.map(function (b) { return speakable(b.say, lang); })
            .join("\n\n");
  }

  /* ---- the caption -------------------------------------------------------
     Everything a viewer would need to check the claim, and the question
     that gets a comment. */
  function caption(reel, lang) {
    var F = reel.facts, L = [];
    var hing = lang === "hinglish", hi = lang === "hi";
    if (F && F.kind === "nakshatra") {
      L.push(F.num + ". " + F.name + " — " + F.loTxt + " to " + F.hiTxt +
             " sidereal, in " + F.rashi + ".");
      L.push("");
      L.push((hi ? "योगतारा: " : hing ? "Yogataara: " : "Junction star: ") +
             F.star + " (" + F.bayer + ") at " + F.starLon.toFixed(2) +
             "°, ecliptic latitude " + F.starLat.toFixed(1) + "° — " +
             (F.inside
               ? (hi ? "अपने ही खाने के भीतर।" : hing ? "apne hi khaane ke andar." : "inside its own division.")
               : (hi ? "अपने खाने से " + F.offTxt + " बाहर।"
                     : hing ? "apne khaane se " + F.offTxt + " bahar."
                            : "outside its own division by " + F.offTxt + ".")));
      L.push((hi ? "इस पट्टी के " : hing ? "Is patti ke " : "Of the ") +
             F.inWin + (hi ? " तारों में से " : hing ? " taaron me se " : " catalogued stars in this stretch, ") +
             F.inArc + (hi ? " भीतर।" : hing ? " andar." : " fall inside."));
      L.push("");
      L.push((hi ? "पाद → नवांश: " : hing ? "Pada → navamsha: " : "Pāda → navāṃśa: ") +
             padaList(F, " · "));
      L.push((hi ? "दशा स्वामी: " : hing ? "Dasha swami: " : "Daśā lord: ") +
             F.lord + " (" + F.lordYears + (hi ? " वर्ष)" : hing ? " saal)" : " years)"));
      L.push((hi ? "योनि: " : "Yoni: ") + F.yoni + " · " +
             (hi ? "गण: " : "Gaṇa: ") + F.gana + " · " +
             (hi ? "नाड़ी: " : "Nāḍī: ") + F.nadi);
      L.push("");
      L.push((hi ? "छत्तीस गुणों में से इक्कीस केवल जन्म नक्षत्र से तय होते हैं — "
                 : hing ? "36 gunon me se 21 sirf janma nakshatra se tay hote hain — "
                        : "Twenty-one of the thirty-six guṇas are fixed by the birth star alone — ") +
             "tārā 3 + yoni 4 + gaṇa 6 + nāḍī 8 = 21/36. " +
             (hi ? "(परवर्ती परम्परा, BPHS नहीं।)"
                 : hing ? "(Baad ki parampara, BPHS nahi.)"
                        : "(Later tradition, not BPHS.)"));
      L.push("");
      L.push((hi ? "तारों की स्थिति HYG सूची से (Hipparcos/Yale/Gliese), J2000, लाहिड़ी अयनांश। "
                 : hing ? "Taaron ki position HYG catalogue se (Hipparcos/Yale/Gliese), J2000, " + (window.__ayanName ? window.__ayanName() : "Lahiri") + " ayanamsa. "
                        : "Star positions from the HYG catalogue (Hipparcos/Yale/Gliese), J2000, " + (window.__ayanName ? window.__ayanName() : "Lahiri") + " ayanāṃśa. ") +
             (hi ? "Stellarium में स्वयं जाँच लीजिए।"
                 : hing ? "Stellarium kholkar khud jaanch lijiye."
                        : "Check it yourself in Stellarium."));
      L.push("");
      L.push(hi ? "क्या यह आपका जन्म नक्षत्र है? नीचे लिखिए।"
                : hing ? "Kya ye aapka janma nakshatra hai? Neeche likhiye."
                       : "Is this your birth star? Say so below.");
    } else if (F && F.kind === "rashi") {
      L.push(F.num + ". " + F.name + " — " + F.lo + "° to " + F.hi +
             "° sidereal. " + F.elem + ", " + F.mode + ", " +
             (hi ? "स्वामी " : hing ? "swami " : "owned by ") + F.lord + ".");
      L.push("");
      L.push(F.naksWhole + (hi ? " नक्षत्र पूरे भीतर, " : hing ? " nakshatra poore andar, " : " nakṣatras sit whole inside it, ") +
             F.naksCut + (hi ? " किनारों से कटे — तीस अंश सवा दो नक्षत्र हैं।"
                             : hing ? " kinaare se kate — tees degree sawa do nakshatra hain."
                                    : " are cut by its edges — thirty degrees is two and a quarter nakṣatras."));
      L.push("");
      L.push((hi ? "पार करने का समय (मापा हुआ): " : hing ? "Paar karne ka samay (naapa hua): " : "Measured crossings: ") +
             F.cross.map(function (q) { return q.name + " " + q.txt; }).join(", ") + ".");
      if (F.riseTxt)
        L.push((hi ? "उदय काल: " : hing ? "Udit hone ka samay: " : "Rises in ") +
               F.riseTxt + (F.place ? " (" + F.place + ")" : "") + ".");
      L.push("");
      L.push((hi ? "सब कुछ ब्राउज़र में गणना — आधुनिक एफ़ेमेरिस, लाहिड़ी अयनांश।"
                 : hing ? "Sab kuch browser me compute hua — modern ephemeris, " + (window.__ayanName ? window.__ayanName() : "Lahiri") + " ayanamsa."
                        : "All computed against a modern ephemeris under " + (window.__ayanName ? window.__ayanName() : "Lahiri") + " ayanāṃśa."));
      L.push(hi ? "आपकी चंद्र राशि कौन सी है?" : hing ? "Aapki chandra rashi kaunsi hai?"
                                                  : "Which is your Moon sign?");
    } else {
      L.push(reel.title + (reel.subtitle ? " — " + reel.subtitle : ""));
      L.push("");
      if (reel.closing && reel.closing.lines)
        reel.closing.lines.forEach(function (x) { if (x) L.push(x); });
    }
    L.push("");
    L.push("@Nirayana.Soft");
    return L.join("\n");
  }

  var TAGS = {
    nakshatra: ["#nakshatra", "#vedicastrology", "#jyotish", "#sidereal",
                "#astronomy", "#stellarium", "#ज्योतिष", "#नक्षत्र"],
    rashi: ["#rashi", "#vedicastrology", "#jyotish", "#sidereal", "#zodiac",
            "#astronomy", "#ज्योतिष", "#राशि"],
    bhava: ["#bhava", "#vedicastrology", "#jyotish", "#bphs", "#kundli",
            "#ज्योतिष"],
    "": ["#vedicastrology", "#jyotish", "#bphs", "#astronomy", "#ज्योतिष"]
  };

  function render(reel, lang) {
    if (!reel) return null;
    lang = lang || "hinglish";
    var times = beatTimes(reel), say = lines(reel, lang);
    var beats = times.map(function (t) {
      var s = say[t.i] || "";
      var need = readSecs(s, lang);
      return { n: t.i + 1, from: t.from, to: t.to, secs: t.secs,
               say: s, need: need, tight: need > t.secs * 1.08 };
    });
    var F = reel.facts;
    return {
      lang: lang,
      title: reel.title,
      seconds: reel.tl ? reel.tl.seconds : null,
      beats: beats,
      overrun: beats.filter(function (b) { return b.tight; }).length,
      caption: caption(reel, lang),
      tags: (TAGS[(F && F.kind) || ""] || TAGS[""]).join(" ")
    };
  }

  /* ---- how long the reel would have to be to be narrated ----------------

     THE FIRST THING THIS GENERATOR FOUND was that the reels are too fast to
     read over. An explainer runs twenty seconds for seven beats, which is
     about two seconds a beat once the lead and tail are taken out — and the
     shortest honest sentence about a junction star's longitude takes six.
     Every beat came back flagged, in all three languages.

     That is not a fault in the script and not a fault in the reel: a reel
     built to be WATCHED and a reel built to be READ OVER are different
     lengths, and nothing had ever been asked to reconcile them. So the
     generator reports the length the narration needs, the Studio offers it
     as a duration, and the same reel can be recorded either way.

     The figure is what each line needs plus the lead and tail the format
     already spends, with a little air between beats — not the bare reading
     time, which would have the narrator starting the next sentence on the
     frame the last one ends. */
  function suggestSeconds(reel, lang) {
    var r = render(reel, lang);
    if (!r || !r.beats.length) return null;
    var tl = reel.tl, fixed = tl ? (tl.lead + tl.tail) : 3;
    var body = 0;
    r.beats.forEach(function (b) { body += Math.max(b.need, 1.2) + 0.45; });
    return Math.round((fixed + body) * 2) / 2;
  }

  window.SPScript = { LANGS: LANGS, render: render, beatTimes: beatTimes,
                      readSecs: readSecs, syllables: syllables,
                      suggestSeconds: suggestSeconds,
                      speech: speech, speakable: speakable };
})();
;

/* ===== The voice track ====================================================

   WHAT THIS IS FOR. The Studio can write a correct silent file. A reel with
   a voice over it is a different thing to watch, and there is no way to make
   one in a browser without a voice from somewhere: speechSynthesis speaks
   out of the speakers and offers no route to an AudioBuffer or a MediaStream,
   so it cannot be captured, and every service that would return an audio file
   is a network request this site does not make. The voice therefore comes in
   as a file the user already has — from a phone's own Shortcut, read by the
   system voice off the "Copy for voiceover" text — and this file's whole job
   is to turn that file into an AudioBuffer the encoder can place on the same
   clock as the frames.

   WHY THE DURATION IS READ RATHER THAN ASSUMED. A voice is as long as it is.
   Trimming it to fit the reel cuts a sentence in half; stretching the reel by
   guesswork leaves the last beat silent or the voice running over black. So
   the file is decoded, its real length measured, and the reel is offered that
   length. The reel bends to the voice, never the other way round.

   WHY CAF IS REJECTED BY NAME. A Shortcut's "Make Spoken Audio from Text"
   saves Core Audio Format, which Chrome and Safari both refuse to decode —
   measured, not assumed: decodeAudioData throws EncodingError on it while the
   same speech as WAV decodes in full. A message that says "could not decode"
   sends someone looking for a fault in the reel; a message that names the
   format and the one extra Shortcut action that fixes it does not. */

(function () {
  "use strict";

  var BUF = null;      /* the decoded voice, or null */
  var NAME = "";
  var CTX = null;

  function ctx() {
    if (CTX) return CTX;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    CTX = new C();
    return CTX;
  }

  /* ---- what will and will not decode -------------------------------------
     The browser is the authority on this, so the extension is used only to
     explain a failure, never to refuse a file that might have worked. */
  var HOPELESS = { caf: "Core Audio (.caf)", aiff: "AIFF", aif: "AIFF",
                   amr: "AMR", wma: "Windows Media Audio" };
  function ext(name) {
    var m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function why(name) {
    var e = ext(name), h = HOPELESS[e];
    if (h)
      return h + " cannot be decoded by any browser. If this came from the " +
             "iPhone Shortcut, add an “Encode Media” action after " +
             "“Make Spoken Audio from Text”, set to Audio Only, " +
             "M4A — then save that. M4A, WAV and MP3 all work here.";
    return "this file could not be decoded as audio. M4A, WAV and MP3 work " +
           "here; .caf, which the iPhone Shortcut saves by default, does not.";
  }

  /* ---- taking the file ---------------------------------------------------- */
  function load(file) {
    var C = ctx();
    if (!C) return Promise.reject(new Error("this browser has no audio engine"));
    if (!file) return Promise.reject(new Error("no file"));
    return file.arrayBuffer().then(function (ab) {
      return new Promise(function (resolve, reject) {
        /* the callback form, because Safari's promise form is younger than
           its callback form and this has to work on an old Mac */
        var ok = function (buf) { resolve(buf); };
        var no = function () { reject(new Error(why(file.name))); };
        try {
          var r = C.decodeAudioData(ab, ok, no);
          if (r && r.then) r.then(ok, no);
        } catch (e) { no(); }
      });
    }).then(function (buf) {
      BUF = buf; NAME = file.name || "voice";
      return info();
    });
  }

  function info() {
    if (!BUF) return null;
    return { name: NAME, seconds: BUF.duration,
             rate: BUF.sampleRate, channels: BUF.numberOfChannels };
  }
  function buffer() { return BUF; }
  function clear() { BUF = null; NAME = ""; }

  /* the length to set the reel to: the voice, plus a breath at the end so
     the last word is not cut off by the final frame */
  function fitSeconds() {
    if (!BUF) return null;
    return Math.ceil(BUF.duration + 0.4);
  }

  /* ===== Mode B — the broadcast chain ====================================

     WHAT IT IS FOR. A system voice reading Devanāgarī off a phone is
     intelligible and thin: it sits in the middle of the band, with no
     chest under it and no air on the consonants, and against a reel's
     music it disappears. Three stages fix most of that, and they are the
     three any broadcast chain starts with — a low shelf for body, a
     presence peak for articulation, and a compressor so the level stops
     wandering.

     WHY THESE NUMBERS. The shelf sits at 180 Hz, under the fundamental of
     a male voice rather than on it, so it adds weight without boom. The
     presence peak is at 3 kHz, which is where the difference between "śa"
     and "sa" lives — the reason it matters more here than in an English
     voiceover is that Sanskrit has three sibilants and a thin voice
     collapses them into one. The compressor is set gently: a 3:1 ratio
     and a slow release level the delivery without the pumping that gives
     a track away as processed.

     It runs offline — OfflineAudioContext renders faster than real time
     and touches no hardware — so it is deterministic and testable, which
     a live graph would not be. */
  var DSP = {
    rate: 48000,
    shelfHz: 180, shelfDb: 4.5,
    peakHz: 3000, peakDb: 3.5, peakQ: 1.1,
    threshold: -20, knee: 6, ratio: 3, attack: 0.004, release: 0.25,
    makeup: 1.25
  };

  function master(buf, opts) {
    opts = Object.assign({}, DSP, opts || {});
    if (typeof OfflineAudioContext === "undefined")
      return Promise.resolve(buf);
    var ch = Math.min(2, buf.numberOfChannels || 1);
    var len = Math.ceil(buf.duration * opts.rate);
    var off = new OfflineAudioContext(ch, len, opts.rate);
    var src = off.createBufferSource();
    src.buffer = buf;

    var shelf = off.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = opts.shelfHz;
    shelf.gain.value = opts.shelfDb;

    var peak = off.createBiquadFilter();
    peak.type = "peaking";
    peak.frequency.value = opts.peakHz;
    peak.gain.value = opts.peakDb;
    peak.Q.value = opts.peakQ;

    /* a high-pass under everything: a phone recording carries handling
       rumble that the low shelf would otherwise amplify */
    var hp = off.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;

    var comp = off.createDynamicsCompressor();
    comp.threshold.value = opts.threshold;
    comp.knee.value = opts.knee;
    comp.ratio.value = opts.ratio;
    comp.attack.value = opts.attack;
    comp.release.value = opts.release;

    var gain = off.createGain();
    gain.gain.value = opts.makeup;

    src.connect(hp); hp.connect(shelf); shelf.connect(peak);
    peak.connect(comp); comp.connect(gain); gain.connect(off.destination);
    src.start();
    return off.startRendering().then(function (out) {
      /* a peak over 1.0 clips on the way into the encoder, so the whole
         render is scaled back if it needs it — measured, not assumed */
      var peakAbs = 0;
      for (var c = 0; c < out.numberOfChannels; c++) {
        var d = out.getChannelData(c);
        for (var i = 0; i < d.length; i += 7)
          if (Math.abs(d[i]) > peakAbs) peakAbs = Math.abs(d[i]);
      }
      if (peakAbs > 0.985) {
        var k = 0.985 / peakAbs;
        for (var c2 = 0; c2 < out.numberOfChannels; c2++) {
          var e = out.getChannelData(c2);
          for (var j = 0; j < e.length; j++) e[j] *= k;
        }
      }
      out.__peak = peakAbs;
      return out;
    });
  }

  /* ===== Mode C — fitting the reel to the voice ==========================
     A reel's beats are even by default; a spoken line is not. Given the
     measured length of each beat's speech, the visual beats are rescaled
     so a scene changes exactly when its sentence ends. The total is held
     to the audio's own length rather than to the sum of the parts, so
     rounding cannot make the picture outrun the voice. */
  function fitBeats(durations, total) {
    var d = (durations || []).map(function (x) {
      return (isFinite(x) && x > 0) ? x : 0;
    });
    var sum = d.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) return null;
    var T = (total && total > 0) ? total : sum;
    var out = d.map(function (x) { return x / sum * T; });
    /* the cumulative edges are what a timeline actually needs */
    var at = 0, edges = [0];
    out.forEach(function (x) { at += x; edges.push(at); });
    /* the last edge is the total exactly, whatever the rounding did */
    edges[edges.length - 1] = T;
    return { seconds: out, edges: edges, total: T };
  }

  /* ===== Mode A — the model store ========================================
     WHAT THIS DOES AND DOES NOT DO, stated plainly because the difference
     matters. It STORES a neural voice model the user supplies from their
     own disk, in IndexedDB, so it survives a reload and is chosen once
     rather than every time. It does NOT download one: this site makes no
     network requests, and a 60 MB model is not something to commit to a
     repository either.

     Running such a model needs an inference runtime (onnxruntime-web and
     its WASM) present on the page. The store exposes `ready()` so a caller
     can ask, and `synthesize()` refuses clearly rather than pretending
     when no runtime is there. That refusal is the honest state of this
     feature today, and it is better than a button that silently does
     nothing. */
  var DB_NAME = "nirayana-voice-store", DB_STORE = "models";
  function idb() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === "undefined")
        return reject(new Error("this browser has no IndexedDB"));
      var rq = indexedDB.open(DB_NAME, 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains(DB_STORE))
          db.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error); };
    });
  }
  function putModel(id, name, blob, meta) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put({ id: id, name: name, blob: blob,
                                       meta: meta || null,
                                       bytes: blob && blob.size,
                                       saved: Date.now() });
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function listModels() {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var out = [];
        var tx = db.transaction(DB_STORE, "readonly");
        var rq = tx.objectStore(DB_STORE).openCursor();
        rq.onsuccess = function () {
          var c = rq.result;
          if (!c) return resolve(out);
          out.push({ id: c.value.id, name: c.value.name,
                     bytes: c.value.bytes, saved: c.value.saved });
          c.continue();
        };
        rq.onerror = function () { reject(rq.error); };
      });
    }).catch(function () { return []; });
  }
  function getModel(id) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readonly");
        var rq = tx.objectStore(DB_STORE).get(id);
        rq.onsuccess = function () { resolve(rq.result || null); };
        rq.onerror = function () { reject(rq.error); };
      });
    });
  }
  function deleteModel(id) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).delete(id);
        tx.oncomplete = function () { resolve(true); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function runtimeReady() {
    return typeof window.ort !== "undefined" &&
           !!(window.ort && window.ort.InferenceSession);
  }
  function synthesize() {
    return Promise.reject(new Error(
      "No neural speech runtime is loaded on this page. The model store " +
      "works and will keep a voice you add from your own disk, but running " +
      "it needs onnxruntime-web present as well. Until then, use the " +
      "iPhone Shortcut route: copy the voiceover text, make spoken audio " +
      "from it, encode to M4A and import the file here."));
  }

  /* ===== iOS ============================================================
     Two things Safari on a phone needs. An AudioContext may only be
     started from inside a real tap, so one is armed on the first touch and
     never before; and a finished file is handed to the share sheet rather
     than to a download, because a download on iOS lands somewhere the
     Photos app and Instagram cannot see. */
  function armOnTap() {
    if (CTX && CTX.state !== "suspended") return;
    var fire = function () {
      try {
        var C = ctx();
        if (C && C.state === "suspended") C.resume();
      } catch (e) {}
      document.removeEventListener("touchend", fire, true);
      document.removeEventListener("click", fire, true);
    };
    document.addEventListener("touchend", fire, true);
    document.addEventListener("click", fire, true);
  }
  function canShareFile(file) {
    try {
      return !!(navigator.canShare && navigator.canShare({ files: [file] }));
    } catch (e) { return false; }
  }
  function shareFile(blob, name) {
    try {
      var f = new File([blob], name, { type: blob.type });
      if (!canShareFile(f)) return Promise.resolve(false);
      return navigator.share({ files: [f], title: name })
        .then(function () { return true; }, function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  }

  try { armOnTap(); } catch (e) {}

  window.SPVoice = { load: load, info: info, buffer: buffer, clear: clear,
                     fitSeconds: fitSeconds, why: why,
                     master: master, DSP: DSP, fitBeats: fitBeats,
                     putModel: putModel, listModels: listModels,
                     getModel: getModel, deleteModel: deleteModel,
                     runtimeReady: runtimeReady, synthesize: synthesize,
                     canShare: canShareFile, share: shareFile,
                     armOnTap: armOnTap };
  /* the name the build spec asks for, over the same module */
  window.NirayanaVoice = window.SPVoice;
})();
;

/* svg-film.js — turn an SVG that can be redrawn into a video file.
 *
 * WHERE THIS CAME FROM. It was written inside ceremony-record.js to film the
 * casting ceremony, and then the ayanāṃśa page needed exactly the same thing
 * for a quite different drawing. The parts that are not about the ceremony
 * are here, and both callers use them rather than carrying a copy each.
 *
 * WHAT IT IS, AND WHAT IT IS NOT. It is not a screen recorder. Nothing is
 * sampled from a clock and no permission is asked for, so the viewer's
 * desktop, cursor and browser cannot appear in the file. The caller hands
 * over a function that puts the drawing into a given state, and this steps
 * that function, photographs the result, and encodes one frame per photograph
 * before asking for the next.
 *
 * WHY IT PHOTOGRAPHS RATHER THAN REDRAWS. The drawings these pages make are
 * SVG, so there is no canvas to captureStream() from. The alternative to
 * photographing the real one was re-implementing each drawing in canvas 2D,
 * which puts a second copy of it in the repository to drift from the first.
 * This serialises the live SVG every frame. The cost is real — a frame is
 * tens of milliseconds — and is why the timeline is paced as it is below.
 *
 * THE CSS HAS TO COME WITH IT. An <img> pointed at serialised SVG is an
 * isolated document and cannot see the page's stylesheet, so every
 * class-driven fill, stroke and font would fall back to a browser default.
 * The computed value of each property that actually draws is written onto the
 * element as an attribute first.
 *
 * HOW THE TIMELINE IS PACED, and why not by frame number. captureStream(0)
 * with requestFrame() stamps each frame with the moment it is pushed, so a
 * file's duration is the wall time the render took, not frames ÷ fps.
 * Stepping content by 1/fps therefore produced a correct-looking take that
 * played at half speed, because rasterising a frame costs more than a frame's
 * worth of time and the encoder believed every one of them. The caller's
 * timeline is driven by ELAPSED time instead, so speed and length come out
 * right; what varies with the machine is how many frames land inside that
 * duration — smoothness — rather than the speed of the motion.
 */
(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  /* Only the properties that actually draw. Copying a whole computed style
     makes a document several megabytes a frame, which is slower to serialise
     than the drawing is to make. */
  var PROPS = ["fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity",
               "stroke-dasharray", "stroke-linecap", "stroke-linejoin", "opacity",
               "font-family", "font-size", "font-weight", "font-style",
               "text-anchor", "letter-spacing", "paint-order", "display",
               "dominant-baseline"];

  function inlineStyles(src, dst) {
    var a = src.querySelectorAll("*"), b = dst.querySelectorAll("*"), i;
    bake(src, dst);
    for (i = 0; i < a.length && i < b.length; i++) bake(a[i], b[i]);
    function bake(from, to) {
      var cs = window.getComputedStyle(from);
      if (!cs) return;
      for (var j = 0; j < PROPS.length; j++) {
        var v = cs.getPropertyValue(PROPS[j]);
        if (v) to.setAttribute(PROPS[j], v);
      }
      to.removeAttribute("class");
    }
  }

  /* One <img> holding the SVG exactly as it stands right now.
     Cropped to what is DRAWN rather than to the viewBox: a viewBox is sized
     for the page it sits on, and fitting it to a feed frame can spend a third
     of the width on margin. getBBox follows the drawing instead. */
  function snapshot(svg, opt) {
    opt = opt || {};
    return new Promise(function (res, rej) {
      var copy = svg.cloneNode(true);
      inlineStyles(svg, copy);
      var vb = svg.getAttribute("viewBox") || "0 0 100 100";
      var box = vb.split(/\s+/).map(Number);
      if (opt.crop !== false) {
        try {
          var bb = svg.getBBox();
          if (bb && bb.width > 1 && bb.height > 1) {
            var m = Math.max(bb.width, bb.height) * (opt.margin == null ? 0.03 : opt.margin);
            box = [bb.x - m, bb.y - m, bb.width + m * 2, bb.height + m * 2];
          }
        } catch (e) {}
      }
      copy.setAttribute("xmlns", NS);
      copy.setAttribute("viewBox", box.join(" "));
      copy.setAttribute("width", box[2]);
      copy.setAttribute("height", box[3]);
      var txt = new XMLSerializer().serializeToString(copy);
      /* a data: URI rather than a blob: URL — a blob URL is same-origin and
         fine over http, but under file:// the origin is "null" and some
         engines refuse it, and this site has to work opened from Finder */
      var im = new Image();
      im.onload = function () { res({ img: im, w: +box[2], h: +box[3] }); };
      im.onerror = function () { rej(new Error("the drawing could not be rasterised")); };
      im.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(txt);
    });
  }

  /* The container the browser can actually encode, asked rather than assumed.
     Safari gives H.264 in MP4, which is what a phone wants; everything else
     gives WebM, which every editor reads and which uploads fine. */
  function pickMime() {
    var want = ["video/mp4;codecs=avc1.42E01E", "video/mp4;codecs=h264",
                "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
    if (typeof MediaRecorder === "undefined") return null;
    for (var i = 0; i < want.length; i++) {
      try { if (MediaRecorder.isTypeSupported(want[i])) return want[i]; } catch (e) {}
    }
    return null;
  }

  function now() {
    return (window.performance && performance.now) ? performance.now() : Date.now();
  }

  /* Record a drawing into a file.
       o.svg()        the live <svg> to photograph, called each frame
       o.at(ms)       put the drawing into the state it should hold at ms
       o.compose(c,W,H,shot,ms)   paint one frame onto the canvas
       o.runMs        how long the finished film should last
       o.width/height the frame size
     Resolves {blob, ext, frames, seconds}. */
  function record(o) {
    var W = o.width || 1080, H = o.height || 1920;
    var mime = pickMime();
    if (!mime) return Promise.reject(new Error("this browser cannot encode video"));
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    if (!cv.captureStream) return Promise.reject(new Error("this browser cannot capture a canvas"));
    var c = cv.getContext("2d");
    var stream = cv.captureStream(0);
    var track = stream.getVideoTracks()[0];
    var rec = new MediaRecorder(stream, { mimeType: mime,
                                          videoBitsPerSecond: o.bitrate || 10000000 });
    var chunks = [];
    rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };

    var runMs = Math.max(200, o.runMs || 6000);
    var i = 0, t0, done, fail;
    var out = new Promise(function (a, b) { done = a; fail = b; });
    rec.onstop = function () {
      done({ blob: new Blob(chunks, { type: mime }),
             ext: mime.indexOf("mp4") >= 0 ? "mp4" : "webm",
             frames: i, seconds: runMs / 1000 });
    };
    rec.start();
    t0 = now();

    function next() {
      var elapsed = now() - t0;
      if (elapsed >= runMs) { try { rec.stop(); } catch (e) { fail(e); } return; }
      var ms = elapsed;
      try { o.at(ms); } catch (e) { try { rec.stop(); } catch (e2) {} return fail(e); }
      var svg = o.svg();
      if (!svg) { try { rec.stop(); } catch (e3) {} return fail(new Error("nothing to photograph")); }
      snapshot(svg, o).then(function (shot) {
        o.compose(c, W, H, shot, ms);
        try { track.requestFrame(); } catch (e) {}
        i++;
        if (o.onProgress) o.onProgress(Math.min(1, (now() - t0) / runMs));
        /* yield, so the page can paint its progress and a long render does
           not read as a hang */
        setTimeout(next, 0);
      }).catch(function (e) {
        try { rec.stop(); } catch (e2) {}
        fail(e);
      });
    }
    next();
    return out;
  }

  /* Hand a finished blob to the reader. */
  function save(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.parentNode && a.parentNode.removeChild(a);
    }, 2000);
  }

  window.SvgFilm = { snapshot: snapshot, pickMime: pickMime, record: record,
                     save: save, inlineStyles: inlineStyles, PROPS: PROPS };
})();
;
