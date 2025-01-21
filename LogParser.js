/* 
    This file incorporates code from Ryuko-ng, which is licensed under the MIT License.
    Copyright (c) 2018-2024 Ryujinx Team and Contributors

    Modifications:
    - Ported/Refacted the code to work with JS
    - Refacted Discord embed to work with discord.js v14
    - 2024 Piplup

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/
const { EmbedBuilder } = require('discord.js');
const { trimCpuString } = require('./LogExtras.js')

function RyuParseLogFile(logData) {
    // Initialize the output object
    const analysedLog = {
        game_info: {
            game_name: 'Unknown',
            warning: 'No wariings found in log',
            error: 'No errors found in log',
            mods: [],
            cheats: [],
        },
        hardware_info: {
            cpu: 'Unknown',
            gpu: 'Unknown',
            ram: 'Unknown',
            os: 'Unknown',
        },
        settings: {
            audio_backend: 'Unknown',
            docked: 'Unknown',
            pptc: 'Unknown',
            shader_cache: 'Unknown',
            vsync: 'Unknown',
            hypervisor: 'Unknown',
            graphics_backend: 'Unknown',
            resolution_scale: 'Unknown',
            anisotropic_filtering: 'Unknown',
            aspect_ratio: 'Unknown',
            texture_recompression: 'Unknown',
            multiplayermode: 'Unknown',
            dram: 'Unknown',
        },
        emu_info: {
            ryu_version: 'Unknown',
            ryu_firmware: 'Unknown',
        },
        log_info: {
            notes: [],
            last_line: '',
            time_elapsed: '',
        }
    };

    // Define patterns and corresponding fields
    const patterns = [
        { key: 'game_info.game_name', pattern: 'Application Loaded:', splitBy: 'Application Loaded:' },
        { key: 'hardware_info.cpu', pattern: 'CPU:', splitBy: 'CPU:' },
        { key: 'hardware_info.gpu', pattern: 'PrintGpuInformation:', splitBy: 'PrintGpuInformation:' },
        { key: 'hardware_info.ram', pattern: 'RAM:', splitBy: 'Application Print: RAM:' },
        { key: 'hardware_info.os', pattern: 'Operating System:', splitBy: 'Operating System:' },
        { key: 'settings.graphics_backend', pattern: 'GraphicsBackend set to:', splitBy: 'GraphicsBackend set to:' },
        { key: 'settings.resolution_scale', pattern: 'ResScale set to:', splitBy: 'ResScale set to:' },
        { key: 'settings.vsync', pattern: 'EnableVsync set to:', splitBy: 'EnableVsync set to:' },
        { key: 'settings.audio_backend', pattern: 'AudioBackend set to:', splitBy: 'AudioBackend set to:' },
        { key: 'settings.docked', pattern: 'DockedMode set to:', splitBy: 'DockedMode set to:' },
        { key: 'settings.pptc', pattern: 'EnablePtc set to:', splitBy: 'EnablePtc set to:' },
        { key: 'settings.shader_cache', pattern: 'ShaderCache set to:', splitBy: 'ShaderCache set to:' },
        { key: 'settings.hypervisor', pattern: 'UseHypervisor set to:', splitBy: 'UseHypervisor set to:' },
        { key: 'settings.anisotropic_filtering', pattern: 'MaxAnisotropy set to:', splitBy: 'MaxAnisotropy set to:' },
        { key: 'settings.aspect_ratio', pattern: 'AspectRatio set to:', splitBy: 'AspectRatio set to:' },
        { key: 'settings.texture_recompression', pattern: 'TextureRecompression set to:', splitBy: 'TextureRecompression set to:' },
        { key: 'settings.memorymode', pattern: 'MemoryManagerMode set to:', splitBy: 'MemoryManagerMode set to:'},
        { key: 'settings.multiplayermode', pattern: 'MultiplayerMode set to:', splitBy: 'MultiplayerMode set to:' },
        { key: 'settings.dram', patterns: 'DramSize set to:', splitBy: 'DramSize set to:' },
        { key: 'emu_info.ryu_version', pattern: 'Ryujinx Version:', splitBy: 'Ryujinx Version:' },
        { key: 'emu_info.ryu_firmware', pattern: 'Firmware Version:', splitBy: 'Firmware Version:' },
        { key: 'game_info.error', pattern: '|E|', splitBy: undefined },
        // Note Patterns
        { key: 'settings.services', pattern: 'IgnoreMissingServices set to:', splitBy: 'IgnoreMissingServices set to:'},
        { key: 'settings.checks', pattern: 'EnableFsIntegrityChecks set to:', splitBy: 'EnableFsIntegrityChecks set to:'},
        { key: 'emu_info.logs', pattern: 'Logs Enabled:', splitBy: 'Logs Enabled:' },
        { key: 'settings.applets', pattern: 'IgnoreApplet set to:', splitBy: 'IgnoreApplet set to:' }
    ];
    const notes = [
        // TODO Fix this check fully
        //{ key: 'firmware', condition: () => !analysedLog.game_info.game_name === 'Unknown' && !match.includes('Using Firmware Version:'), message: '**❌ Nintendo Switch firmware not found**' },
        { key: 'amdopengl', condition: () => analysedLog.settings.graphics_backend.includes('OpenGl') && analysedLog.hardware_info.gpu.includes('AMD') && analysedLog.hardware_info.os.includes('Windows'), message: '**⚠️ AMD GPU users should consider using Vulkan graphics backend**' },
        { key: 'intelopengl', condition: () => analysedLog.settings.graphics_backend.includes('OpenGl') && analysedLog.hardware_info.gpu.includes('Intel') && analysedLog.hardware_info.os.includes('Windows'), message: '**⚠️ Intel GPU users should consider using Vulkan graphics backend**' },
        { key: 'rosetta', match: 'VirtualApple', message: '🔴 **Rosetta should be disabled**' },
        { key: 'debuglogs', condition: () => analysedLog.emu_info.logs.includes('Debug'), message: '⚠️ **Debug logs enabled will have a negative impact on performance**' },
        { key: 'dummyaudio', condition: () => analysedLog.settings.audio_backend === 'Dummy', message: '⚠️ Dummy audio backend, consider changing to SDL2 or OpenAL' },
        { key: 'pptc', condition: () => analysedLog.settings.pptc === 'False', message: '🔴 **PPTC cache should be enabled**' },
        { key: 'shadercache', condition: () => analysedLog.settings.shader_cache === 'False', message: '🔴 **Shader cache should be enabled**' },
        { key: 'softwarememory', condition: () => analysedLog.settings.memorymode === 'SoftwarePageTable', message: '🔴 **`Software` setting in Memory Manager Mode will give slower performance than the default setting of `Host unchecked`**' },
        { key: 'missingservices', condition: () => analysedLog.settings.services === 'True', message: '⚠️ `Ignore Missing Services` being enabled can cause instability' },
        { key: 'fschecks', condition: () => analysedLog.settings.checks === 'False', message: '⚠️ Disabling file integrity checks may cause corrupted dumps to not be detected' },
        { key: 'vsync', condition: () => analysedLog.settings.vsync === 'False', message: '⚠️ V-Sync disabled can cause instability like games running faster than intended or longer load times' },
        { key: 'IgnoreApplet', condition: () => analysedLog.settings.applets === 'True', message: '⚠️ `Ignore Applets` can cause instability like games not functioning corrently' },
        { key: 'hasherror', match: '(2002-4604): Hash error!', message: '⚠️ Dump error detected. Investigate possible bad game/firmware dump issues' },
        { key: 'gamecrashed', regex: /\(ResultErrApplicationAborted \(\d{4}-\d{4}\)\)/, message: '🔴 The game itself crashed' },
        { key: 'missingkeys', match: 'MissingKeyException', message: '⚠️ Keys or firmware out of date, consider updating them' },
        { key: 'permerror', match: 'ResultFsPermissionDenied (2002-6400)', message: '⚠️ File permission error. Consider deleting save directory and allowing Ryujinx to make a new one' },
        { key: 'fstargeterror', match: 'ResultFsTargetNotFound (2002-1002)', message: '⚠️ Save not found error. Consider starting game without a save file or using a new save file' },
        { key: 'serviceerror', match: 'ServiceNotImplementedException', message: '⚠️ Consider enabling `Ignore Missing Services` in Ryujinx settings' },
        { key: 'vramerror', match: 'ErrorOutOfDeviceMemory', message: '⚠️ Consider enabling `Texture Recompression` in Ryujinx settings' },
        { key: 'defaultprofile', match: 'UserId: 00000000000000010000000000000000', message: '⚠️ Default user profile in use, consider creating a custom one.' },
        { key: 'savedataindex', match: 'ResultKvdbInvalidKeyValue (2020-0005)', message: '🔴 **Savedata index for the game maybe corrupted**' }
    ];

    // function to parse the pattrens
    const setValue = (key, value) => {
        const keys = key.split('.');
        let obj = analysedLog;
        while (keys.length > 1) {
            const k = keys.shift();
            obj = obj[k];
        }
        obj[keys[0]] = value.trim();
    };

    const parseNotes = (lines) => {
        notes.forEach(({ match, condition, regex, message }) => {
            if (condition && condition()) {
                analysedLog.log_info.notes.unshift(message);
            } else if (match && lines.some(line => line.includes(match))) {
                analysedLog.log_info.notes.unshift(message);
            } else if (regex && lines.some(line => regex.test(line))) {
                analysedLog.log_info.notes.unshift(message);
            }
        });
        analysedLog.log_info.notes = [...new Set(analysedLog.log_info.notes)];
    };

    const convertGiBtoMiB = (gib) => {
        return Math.round(parseFloat(gib) * 1024);
    };

    // Split log data into lines
    const lines = logData.split('\n');
    const totalLines = lines.length;
    // Extract the first X and last X lines to stop abuse from large files
    const firstXLines = lines.slice(0, 34);

    let modsCount = 0;
    let cheatsCount = 0;
    let controllersConfigured = '';
    let isMacOS = false;
    let isWindows = false;
    let isUnix = false;

/*
    We scan the log file here twice to make sure we have the OS option set for detecting the OS for the hypervisor option,
    This is because hypervisor shows up before the OS so we have to check the log twice to grab the OS before parsing it correctly
    Example Log:
        00:00:00.181 |I| Configuration LogValueChange: UseHypervisor set to: True
        00:00:00.183 |I| Configuration LogValueChange: MultiplayerMode set to: LdnMitm
        00:00:00.183 |N| Application PrintSystemInfo: Ryujinx Version: 1.1.1403
        00:00:00.185 |N| Application Print: Operating System: macOS 14.4.0 (23E214)
*/
    firstXLines.forEach(line => {
        if (line.includes('Operating System:')) {
            const os = line.split('Operating System:')[1].trim();

            // Determine OS type with case-insensitive matching
            const osLower = os.toLowerCase();
            if (osLower.includes('macos')) {
                isMacOS = true;
            } else if (osLower.includes('windows')) {
                isWindows = true;
            } else {
                isUnix = true;
            }
        }
    });

    //Refer to the comment on line 118-126
    lines.forEach(line => {
        for (const { key, pattern, splitBy } of patterns) {
            if ((typeof pattern === 'string' && line.includes(pattern)) || 
                (pattern instanceof RegExp && pattern.test(line))) {
                
                let value;
                if (splitBy === undefined) {
                    value = line;
                } else {
                    // Use regex if `splitBy` is a RegExp, otherwise split as usual
                    value = splitBy instanceof RegExp ? line.split(splitBy)[1]?.trim() : line.split(splitBy)[1]?.trim();
                }
        
                // Special handling for GPU information to avoid parsing GPU memory
                if (key === 'hardware_info.gpu' && value.includes("GPU Memory")) {
                    continue
                } else if (key === "hardware_info.ram") {
                    const totalMatch = line.match(/Total\s+([\d.]+)\s*GiB/);
                    const availableMatch = line.match(/Available\s+([\d.]+)\s*GiB/);
                    if (totalMatch && availableMatch) {
                        const totalGiB = totalMatch[1];
                        const availableGiB = availableMatch[1];
                        const totalMiB = convertGiBtoMiB(totalGiB);
                        const availableMiB = convertGiBtoMiB(availableGiB);

                        if(availableMiB < 8192) analysedLog.log_info.notes.push(`⚠️ Less than 8gb of ram available (${availableMiB}MiB)`)

                        analysedLog.hardware_info.ram = `${availableMiB}/${totalMiB}`;
                    }
                } else if (key === "settings.hypervisor") {
                    if (isMacOS) {
                        setValue('settings.hypervisor', value);
                    } else {
                        setValue('settings.hypervisor', 'N/A');
                    }
                } else {
                    setValue(key, value);
                }
                break;
            }
        }

        // Additional processing for mods, cheats, and controller info
        if(line.includes('AddModsFromDirectory: Found enabled mod')) {
            modsCount++;
            if(modsCount <= 5) {
                analysedLog.game_info.mods.push(`:information_source: ${line.split('AddModsFromDirectory: Found enabled mod')[1].trim()}`);
            }
        } else if (line.includes('LoadCheats: Installing cheat')) {
            cheatsCount++;
            if(cheatsCount <= 5) {
                analysedLog.game_info.cheats.push(`:information_source: ${line.split('LoadCheats: Installing cheat')[1].trim()}`);
            }
        } else if(line.includes('Hid Configure:')) {
            controllersConfigured = line.split('Hid Configure:')[1].trim();
        }
    });

    // Add additional mods or cheats count if more than 5
    if (modsCount > 5) { analysedLog.game_info.mods.push(`:scissors: ${modsCount - 5} other mods`); }
    if (cheatsCount > 5) { analysedLog.game_info.cheats.push(`:scissors: ${cheatsCount - 5} other cheats`); }

    // Add default messages if no mods or cheats are found
    if (modsCount === 0) { analysedLog.game_info.mods.push("No Mods found"); }
    if (cheatsCount === 0) { analysedLog.game_info.cheats.push("No Cheats found"); }

    // Add controller information to notes
    if(controllersConfigured) { analysedLog.log_info.notes.push(`:information_source: ${controllersConfigured}`); } else 
                              { analysedLog.log_info.notes.push(`:warning: Unable to detect any controllers`); }

    parseNotes(lines);

    return analysedLog;
}

function RyuCreateEmbed(analysedLog, author) {
    const cleanName = (name = 'Unknown', pattern = '') => {
        if (typeof pattern === 'string') {
            return name.replace(pattern, '').trim(); // Simple replacement for strings
        } else if (pattern instanceof RegExp) {
            return name.replace(pattern, '').trim(); // Regex replacement
        }
        return name.trim(); // Default fallback with trimming
    };
    const getMode = (setting, trueValue = "Enabled", falseValue = "Disabled") => setting === "True" ? trueValue : falseValue;
    const getMappingValue = (mappings, key, defaultValue = 'N/A') => mappings[key] || defaultValue;

    const resolutionMappings = {
        "1": "Native (720p/1080p)",
        "2": "2x (1440p/2160p)",
        "3": "3x (2160p/3240p)",
        "4": "4x (3240p/4320p)",
        "-1": "Custom",
    };
    const aspectMappings = {
        "Fixed4x3": "4:3",
        "Fixed16x9": "16:9",
        "Fixed16x10": "16:10",
        "Fixed21x9": "21:9",
        "Fixed32x9": "32:9",
        "Stretched": "Stretch to Fit Window",
    };
    const anisotropicMappings = {
        "2": "2x",
        "4": "4x",
        "8": "8x",
        "16": "16x",
        "-1": "Auto",
    };

    const hardwareInfo = `**CPU:** ${trimCpuString(analysedLog.hardware_info.cpu)} | **GPU:** ${analysedLog.hardware_info.gpu} | **RAM:** ${analysedLog.hardware_info.ram} MiB | **OS:** ${analysedLog.hardware_info.os}`;

    const systemSettingsInfo = `
        **Audio Backend:** \`${analysedLog.settings.audio_backend}\`
        **Console Mode:** \`${getMode(analysedLog.settings.docked, "Docked", "Handheld")}\`
        **PPTC Cache:** \`${getMode(analysedLog.settings.pptc)}\`
        **Shader Cache:** \`${getMode(analysedLog.settings.shader_cache)}\`
        **V-Sync:** \`${getMode(analysedLog.settings.vsync)}\`
        **Hypervisor:** \`${getMode(analysedLog.settings.hypervisor)}\`
        **LDN Mode:** \`${analysedLog.settings.multiplayermode}\`
    `.trim();

    const graphicsSettingsInfo = `
        **Graphics Backend:** \`${analysedLog.settings.graphics_backend}\`
        **Resolution:** \`${getMappingValue(resolutionMappings, analysedLog.settings.resolution_scale)}\`
        **Anisotropic Filtering:** \`${getMappingValue(anisotropicMappings, analysedLog.settings.anisotropic_filtering)}\`
        **Aspect Ratio:** \`${getMappingValue(aspectMappings, analysedLog.settings.aspect_ratio)}\`
        **Texture Recompression:** \`${getMode(analysedLog.settings.texture_recompression)}\`
    `.trim();

    const ryujinxInfo = `**Version:** ${analysedLog.emu_info.ryu_version} | **Firmware:** ${analysedLog.emu_info.ryu_firmware}`;

    const fields = [
        { name: "General Info", value: `${ryujinxInfo} | ${hardwareInfo}`, inline: false },
        { name: "System Settings", value: systemSettingsInfo, inline: true },
        { name: "Graphics Settings", value: graphicsSettingsInfo, inline: true },
        analysedLog.game_info.error ? { name: "Latest Error Snippet", value: `\`\`\`${analysedLog.game_info.error}\`\`\``, inline: false } : { name: "Latest Error Snippet", value: `No errors found in log`, inline: false },
        analysedLog.game_info.game_name === "Unknown" ? { name: "No Game Boot Detected", value: `No game boot has been detected in the log file. To get a proper log, follow these steps:\n1) In Logging settings, ensure **Enable Logging to File** is checked.\n2) Ensure the following default logs are enabled: **Info**, **Warning**, **Error**, **Guest**, and **Stub**.\n3) Start a game up.\n4) Play until your issue occurs.\n5) Upload the latest log file which is larger than **3KB**.`, inline: false } : null,
        { name: "Mods", value: analysedLog.game_info.mods.join("\n") || "No Mods found", inline: false },
        { name: "Cheats", value: analysedLog.game_info.cheats.join("\n") || "No Cheats found", inline: false },
        { name: "Notes", value: analysedLog.log_info.notes.join("\n") || "No notes", inline: false }
    ].filter(Boolean);

    const logEmbed = new EmbedBuilder()
        .setTitle(`${cleanName(analysedLog.game_info.game_name, /\s\[(64|32)-bit\]$/)}`)
        .setColor(0x1e90ff)
        .addFields(fields)
        .setFooter({ text: `Log uploaded by ${author.username}`, iconURL: author.displayAvatarURL({ size: 4096, dynamic: true }) });

    return logEmbed;
}


module.exports = {
    RyuParseLogFile,
    RyuCreateEmbed,
}