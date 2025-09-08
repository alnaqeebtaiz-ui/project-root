/*
 * Backup Service
 * This file will contain logic for downloading local backups (JSON/CSV).
 */

// Example function to download data as JSON
function downloadJson(data, filename) {
    const dataStr = JSON.stringify(data, null, 4);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Example function to download data as CSV
function downloadCsv(data, filename) {
    // Assuming data is an array of objects with consistent keys
    if (!data || data.length === 0) {
        console.warn("No data to export to CSV.");
        return;
    }

    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(",")); // Add headers

    for (const row of data) {
        const values = headers.map(header => {
            const escaped = ('' + row[header]).replace(/'"'/g, '""');
            return `"${escaped}"`;
        });
        csvRows.push(values.join(","));
    }

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "backup.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

console.log("backup-service.js loaded. Add your backup functionalities here.");


