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

function RyuParseLogFile(logData) {
    // Initialize the output object
    const analysedLog = {
        game_info: {
            game_name: 'Unknown',
            error: 'No errors found in log',
            mods: [],
            cheats: [],
        },
        hardware_info: {
            cpu: 'N/A',
            gpu: 'N/A',
            ram: 'N/A',
            os: 'N/A',
        },
        settings: {
            audio_backend: 'N/A',
            docked: 'N/A',
            pptc: 'N/A',
            shader_cache: 'N/A',
            vsync: 'N/A',
            hypervisor: 'N/A',
            graphics_backend: 'N/A',
            resolution_scale: 'N/A',
            anisotropic_filtering: 'N/A',
            aspect_ratio: 'N/A',
            texture_recompression: 'N/A',
            multiplayermode: 'N/A',
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
        { key: 'settings.multiplayermode', pattern: 'MultiplayerMode set to:', splitBy: 'MultiplayerMode set to:' },
        { key: 'emu_info.ryu_version', pattern: 'Ryujinx Version:', splitBy: 'Ryujinx Version:' },
        { key: 'emu_info.ryu_firmware', pattern: 'Firmware Version:', splitBy: 'Firmware Version:' },
        { key: 'game_info.error', pattern: '|E|', splitBy: '|E|' }
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

    const convertGiBtoMiB = (gib) => {
        return Math.round(parseFloat(gib) * 1024);
    };

    const lines = logData.split('\n');
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
    lines.forEach(line => {
        if (line.includes('Operating System:')) {
            const os = line.split('Operating System:')[1].trim();
            analysedLog.hardware_info.os = os;
    
            // Log the detected OS
            debug(`Detected OS: ${os}`);
    
            // Detect the OS type with case-insensitive matching because MacOS is werid
            if(os.toLowerCase().includes('macos')) {
                isMacOS = true;
                debug('isMacOS set to true');
            } else if(os.toLowerCase().includes('windows')) {
                isWindows = true;
                debug('isWindows set to true');
            } else {
                isUnix = true;
                debug('isunix set to true');
            }
    
            debug(`MacOS: ${isMacOS}, Windows: ${isWindows}, Linux/Other: ${isUnix}`);
        }
    });
    
    //Refer to the comment on line 118-126
    lines.forEach(line => {
        for(const { key, pattern, splitBy } of patterns) {
            if(line.includes(pattern)) {
                const value = line.split(splitBy)[1].trim();
            
                // Special handling for GPU information to avoid parsing GPU memory
                if(key === 'hardware_info.gpu') {
                    if(!value.includes("GPU Memory")) {
                        setValue(key, value);
                    }
                }                
                else if(key === "hardware_info.ram") {
                    const totalMatch = line.match(/Total\s+([\d.]+)\s*GiB/);
                    const availableMatch = line.match(/Available\s+([\d.]+)\s*GiB/);
                    if(totalMatch && availableMatch) {
                        const totalGiB = totalMatch[1];
                        const availableGiB = availableMatch[1];
                        const totalMiB = convertGiBtoMiB(totalGiB);
                        const availableMiB = convertGiBtoMiB(availableGiB);
                        analysedLog.hardware_info.ram = `${availableMiB}/${totalMiB}`;
                    }
                } else if(key === "settings.hypervisor") {
                    if(isMacOS) {
                        setValue('settings.hypervisor', value);
                        debug('Hypervisor setting applied for macOS:', value);
                    } else {
                        setValue('settings.hypervisor', 'N/A');
                        debug('Hypervisor setting not applied for non-macOS');
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
        } else if(line.includes('Logs Enabled: Info, Warning, Error, Guest, Stub')) {
            analysedLog.log_info.notes.push(`✅ Default Logs Enabled`);
        }
        

        // Continuously store the current line as the last line
        analysedLog.log_info.last_line = line.trim();
    });

    // Add additional mods or cheats count if more than 5
    if (modsCount > 5) {
        analysedLog.game_info.mods.push(`:scissors: ${modsCount - 5} other mods`);
    }
    if (cheatsCount > 5) {
        analysedLog.game_info.cheats.push(`:scissors: ${cheatsCount - 5} other cheats`);
    }

    // Add default messages if no mods or cheats are found
    if (modsCount === 0) {
        analysedLog.game_info.mods.push("No Mods found");
    }
    if (cheatsCount === 0) {
        analysedLog.game_info.cheats.push("No Cheats found");
    }

    // Add controller information to notes
    analysedLog.log_info.notes.unshift(`:information_source: ${controllersConfigured}`);

    /*
        Extract time elapsed from the last line
        i never got around to fiixing this but it's good enough for me - Piplup
    */
    const timeElapsedMatch = analysedLog.log_info.last_line.match(/^(\d{2}:\d{2}:\d{2}\.\d{3})/);
    if (timeElapsedMatch) {
        analysedLog.log_info.notes.push(`:information_source: Time Elapsed: ${timeElapsedMatch[1]}`);
    }

    return analysedLog;
}

function RyuCreateEmbed(analysedLog, author) {
    const cleanName = (name = 'Unknown', pattern = '') => name.replace(pattern, '');
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

    const hardwareInfo = `**CPU:** ${cleanName(analysedLog.hardware_info.cpu, /\s\[logical\]$/)} | **GPU:** ${analysedLog.hardware_info.gpu} | **RAM:** ${analysedLog.hardware_info.ram} MiB | **OS:** ${analysedLog.hardware_info.os}`;

    const systemSettingsInfo = `
        **Audio Backend:** \`${analysedLog.settings.audio_backend}\`
        **Console Mode:** \`${getMode(analysedLog.settings.docked, "Docked", "Handheld")}\`
        **PPTC Cache:** \`${getMode(analysedLog.settings.pptc)}\`
        **Shader Cache:** \`${getMode(analysedLog.settings.shader_cache)}\`
        **V-Sync:** \`${getMode(analysedLog.settings.vsync)}\`
        **Hypervisor:** \`${analysedLog.settings.hypervisor}\`
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
        { name: "Latest Error Snippet", value: `\`\`\`${analysedLog.game_info.error || "No errors found in log"}\`\`\``, inline: false },
        { name: "Mods", value: analysedLog.game_info.mods.join("\n") || "No Mods found", inline: false },
        { name: "Cheats", value: analysedLog.game_info.cheats.join("\n") || "No Cheats found", inline: false },
        { name: "Notes", value: analysedLog.log_info.notes.join("\n") || "No notes", inline: false }
    ];

    const logEmbed = new EmbedBuilder()
        .setTitle(cleanName(analysedLog.game_info.game_name, /\s\[(64|32)-bit\]$/))
        .setColor(0x1e90ff)
        .addFields(fields)
        .setFooter({ text: `Log uploaded by ${author.username}`, iconURL: author.displayAvatarURL({ size: 4096, dynamic: true }) });

    return logEmbed;
}


module.exports = {
    RyuParseLogFile,
    RyuCreateEmbed
}