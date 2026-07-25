import fs from 'fs';
import JSZip from 'jszip';

async function run() {
    const docxPath = '/Users/thanhtung/Downloads/hitrang/11.docx';
    const fileData = fs.readFileSync(docxPath);
    const zip = await JSZip.loadAsync(fileData);
    
    for (const key of ['word/embeddings/oleObject26.bin', 'word/embeddings/oleObject27.bin']) {
        const file = zip.file(key);
        if (!file) continue;
        console.log(`\n--- ${key} ---`);
        const rawBuf = await file.async('nodebuffer');
        
        const extractEquationNativeStream = (data: Uint8Array): Uint8Array | null => {
            if (!data || data.length < 512) return null;
            if (data[0] !== 0xD0 || data[1] !== 0xCF || data[2] !== 0x11 || data[3] !== 0xE0 ||
                data[4] !== 0xA1 || data[5] !== 0xB1 || data[6] !== 0x1A || data[7] !== 0xE1) {
                return null;
            }
            try {
                const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
                const sectorSize = 1 << view.getUint16(30, true);
                const miniSectorSize = 1 << view.getUint16(32, true);
                const dirStartSector = view.getUint32(48, true);
                const miniCutoff = view.getUint32(56, true);
                const miniFatStart = view.getUint32(60, true);
                const difat: number[] = [];
                for (let k = 0; k < 109; k++) {
                    const sec = view.getUint32(76 + k * 4, true);
                    if (sec < 0xFFFFFFFC) difat.push(sec);
                }
                let fatSector = view.getUint32(68, true);
                let numFat = view.getUint32(72, true);
                for (let s = 0; s < numFat; s++) {
                    if (fatSector < 0xFFFFFFFC) {
                        let offset = 512 + fatSector * sectorSize;
                        for (let k = 0; k < sectorSize / 4; k++) {
                            const sec = view.getUint32(offset + k * 4, true);
                            if (sec < 0xFFFFFFFC) difat.push(sec);
                        }
                    }
                }
                const fat: number[] = [];
                difat.forEach(sec => {
                    let offset = 512 + sec * sectorSize;
                    for (let k = 0; k < sectorSize / 4; k++) {
                        fat.push(view.getUint32(offset + k * 4, true));
                    }
                });
                let miniFat: number[] = [];
                let currMiniFatSec = miniFatStart;
                while (currMiniFatSec < 0xFFFFFFFC) {
                    let offset = 512 + currMiniFatSec * sectorSize;
                    for (let k = 0; k < sectorSize / 4; k++) {
                        miniFat.push(view.getUint32(offset + k * 4, true));
                    }
                    currMiniFatSec = fat[currMiniFatSec];
                }
                let dirSec = dirStartSector;
                let dirBytes = Buffer.alloc(0);
                while (dirSec < 0xFFFFFFFC) {
                    let offset = 512 + dirSec * sectorSize;
                    dirBytes = Buffer.concat([dirBytes, Buffer.from(data.subarray(offset, offset + sectorSize))]);
                    dirSec = fat[dirSec];
                }
                let rootStartSec = 0xFFFFFFFF;
                let rootSize = 0;
                let eqnSec = 0xFFFFFFFF;
                let eqnSize = 0;
                for (let offset = 0; offset < dirBytes.length; offset += 128) {
                    let name = "";
                    for (let k = 0; k < 64; k += 2) {
                        let char = dirBytes.readUint16LE(offset + k);
                        if (char === 0) break;
                        name += String.fromCharCode(char);
                    }
                    const type = dirBytes.readUint8(offset + 66);
                    const startSec = dirBytes.readUint32LE(offset + 116);
                    const size = dirBytes.readUint32LE(offset + 120);
                    if (type === 5) {
                        rootStartSec = startSec;
                        rootSize = size;
                    } else if (name === "Equation Native") {
                        eqnSec = startSec;
                        eqnSize = size;
                    }
                }
                if (eqnSec < 0xFFFFFFFC) {
                    let eqnData = Buffer.alloc(0);
                    if (eqnSize < miniCutoff) {
                        let miniStream = Buffer.alloc(0);
                        let rootSec = rootStartSec;
                        while (rootSec < 0xFFFFFFFC) {
                            let offset = 512 + rootSec * sectorSize;
                            miniStream = Buffer.concat([miniStream, Buffer.from(data.subarray(offset, offset + sectorSize))]);
                            rootSec = fat[rootSec];
                        }
                        let currSec = eqnSec;
                        while (currSec < 0xFFFFFFFC) {
                            let offset = currSec * miniSectorSize;
                            eqnData = Buffer.concat([eqnData, Buffer.from(miniStream.subarray(offset, offset + miniSectorSize))]);
                            currSec = miniFat[currSec];
                        }
                    } else {
                        let currSec = eqnSec;
                        while (currSec < 0xFFFFFFFC) {
                            let offset = 512 + currSec * sectorSize;
                            eqnData = Buffer.concat([eqnData, Buffer.from(data.subarray(offset, offset + sectorSize))]);
                            currSec = fat[currSec];
                        }
                    }
                    return new Uint8Array(eqnData.subarray(28, 28 + eqnSize));
                }
            } catch (e) {}
            return null;
        };
        const buf = extractEquationNativeStream(rawBuf) || rawBuf;
        
        let i = 0;
        let dsmtIdx = -1;
        for (let k = 0; k < buf.length - 4; k++) {
            if (buf[k] === 68 && buf[k+1] === 83 && buf[k+2] === 77 && buf[k+3] === 84) {
                dsmtIdx = k;
                break;
            }
        }
        if (dsmtIdx === -1) continue;
        
        let startIdx = -1;
        for (let k = dsmtIdx; k < buf.length - 9; k++) {
            if (
                buf[k] === 77 && buf[k+1] === 84 && buf[k+2] === 32 &&
                buf[k+3] === 69 && buf[k+4] === 120 && buf[k+5] === 116 &&
                buf[k+6] === 114 && buf[k+7] === 97 && buf[k+8] === 0
            ) {
                startIdx = k + 9;
                break;
            }
        }
        if (startIdx === -1) startIdx = dsmtIdx + 30;
        
        i = startIdx;
        while (i < buf.length - 1) {
            const tag = buf[i];
            let idx = i + 1;
            if (tag === 2) {
                const opts = buf[idx];
                idx += 1;
                if (opts & 0x08) {
                    const dxVal = buf[idx];
                    if (dxVal === 128) idx += 6;
                    else idx += 2;
                }
                const tf = buf[idx];
                idx += 1;
                let mtcode = 0;
                if (!(opts & 0x20)) {
                    mtcode = buf[idx] + (buf[idx+1] << 8);
                    idx += 2;
                }
                let char8 = null;
                if (opts & 0x04) {
                    char8 = buf[idx];
                    idx += 1;
                }
                console.log(`CHAR: mtcode=${mtcode}, char8=${char8}, tf=${tf}`);
            } else if (tag === 3) {
                const opts = buf[idx];
                idx += 1;
                if (opts & 0x08) {
                    const dxVal = buf[idx];
                    if (dxVal === 128) idx += 6;
                    else idx += 2;
                }
                const selector = buf[idx];
                const variation = buf[idx+1] + (buf[idx+2] << 8);
                console.log(`TMPL: selector=${selector}, variation=${variation}`);
                idx += 3;
            } else if (tag === 0) {
                console.log("END");
            } else if (tag === 1) {
                console.log("LINE");
                const opts = buf[idx];
                idx += 1;
                if (opts & 0x08) {
                    const dxVal = buf[idx];
                    if (dxVal === 128) idx += 6;
                    else idx += 2;
                }
            } else {
                if (tag === 8 || tag === 17) {
                    idx += 1;
                    while (idx < buf.length && buf[idx] !== 0) idx += 1;
                    idx += 1;
                } else if (tag === 9) {
                    idx += 2;
                } else if (tag === 15) {
                    idx += 1;
                } else if (tag === 16) {
                    idx += 1;
                    if (buf[idx-1] & 0x01) idx += 4;
                    else idx += 3;
                    while (idx < buf.length && buf[idx] !== 0) idx += 1;
                    idx += 1;
                }
            }
            i = idx;
        }
    }
}

run().catch(err => console.error(err));
