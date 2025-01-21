function trimCpuString(cpuString) {
    // Regex to capture everything up to "CPU" (excluding "CPU" itself)
    const match = cpuString.match(/^[^@;]+?(?=(\s(CPU|Processor|[0-9]+-Core)|\s;|\s@|$))/);
    if (match) {
        return match[0].trim(); // Trim any trailing spaces
    } else {
        return cpuString; // Return the original string if no match is found
    }
}

module.exports = {
    trimCpuString
}