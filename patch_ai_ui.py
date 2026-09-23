import os
import re

file_path = 'ai-service/main.py'
with open(file_path, 'r') as f:
    content = f.read()

# Add HTMLResponse import if missing
if 'HTMLResponse' not in content:
    content = content.replace('from fastapi import FastAPI, File, UploadFile', 'from fastapi import FastAPI, File, UploadFile\nfrom fastapi.responses import HTMLResponse')

# The HTML template for the UI
html_template = """
@app.get("/", response_class=HTMLResponse)
def web_interface():
    return \"\"\"
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PaveSafe AI Microservice | Batch Tester</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .loader { border-top-color: #3b82f6; -webkit-animation: spinner 1.5s linear infinite; animation: spinner 1.5s linear infinite; }
            @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen p-8 font-sans">
        <div class="max-w-6xl mx-auto">
            <header class="mb-8 border-b border-slate-700 pb-4">
                <h1 class="text-3xl font-bold text-white flex items-center gap-3">
                    <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    PaveSafe AI Tester
                </h1>
                <p class="text-slate-400 mt-2">Upload individual images or bulk folders to test the YOLOv8 Pure Function pipeline.</p>
            </header>

            <!-- Upload Area -->
            <div class="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-2xl mb-8">
                <div class="flex items-center justify-center w-full">
                    <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-700/50 hover:bg-slate-700/80 transition-all group">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg class="w-10 h-10 mb-3 text-slate-400 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p class="mb-2 text-sm text-slate-300"><span class="font-semibold text-blue-400">Click to upload</span> or drag and drop</p>
                            <p class="text-xs text-slate-500">Supports multiple JPG, PNG images</p>
                        </div>
                        <input id="dropzone-file" type="file" class="hidden" multiple accept="image/*" />
                    </label>
                </div>
            </div>

            <!-- Results Grid -->
            <div id="results-container" class="hidden">
                <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
                    Results <span id="count-badge" class="bg-blue-600 text-sm py-0.5 px-2 rounded-full">0</span>
                </h2>
                <div class="overflow-x-auto bg-slate-800 rounded-xl border border-slate-700 shadow-xl">
                    <table class="w-full text-sm text-left text-slate-300">
                        <thead class="text-xs uppercase bg-slate-900/50 text-slate-400 border-b border-slate-700">
                            <tr>
                                <th scope="col" class="px-6 py-4 rounded-tl-lg">Image</th>
                                <th scope="col" class="px-6 py-4">Filename</th>
                                <th scope="col" class="px-6 py-4">Status & Severity</th>
                                <th scope="col" class="px-6 py-4 rounded-tr-lg w-1/2">Raw AI Output</th>
                            </tr>
                        </thead>
                        <tbody id="results-table">
                            <!-- Rows will be injected here -->
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            const fileInput = document.getElementById('dropzone-file');
            const resultsContainer = document.getElementById('results-container');
            const resultsTable = document.getElementById('results-table');
            const countBadge = document.getElementById('count-badge');
            
            let totalProcessed = 0;

            fileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if(files.length === 0) return;
                
                resultsContainer.classList.remove('hidden');
                
                for(let i=0; i<files.length; i++) {
                    const file = files[i];
                    const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
                    
                    // Create preview URL
                    const previewUrl = URL.createObjectURL(file);
                    
                    // Add loading row
                    const tr = document.createElement('tr');
                    tr.id = rowId;
                    tr.className = 'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors';
                    tr.innerHTML = \`
                        <td class="px-6 py-4">
                            <img src="\${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600">
                        </td>
                        <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="\${file.name}">\${file.name}</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-2">
                                <div class="w-4 h-4 border-2 border-slate-500 rounded-full border-t-blue-500 animate-spin"></div>
                                <span class="text-slate-400 animate-pulse">Analyzing...</span>
                            </div>
                        </td>
                        <td class="px-6 py-4">
                            <div class="h-2 bg-slate-700 rounded w-1/2 animate-pulse mb-2"></div>
                            <div class="h-2 bg-slate-700 rounded w-1/3 animate-pulse"></div>
                        </td>
                    \`;
                    
                    // Prepend so newest is on top
                    resultsTable.insertBefore(tr, resultsTable.firstChild);
                    
                    totalProcessed++;
                    countBadge.innerText = totalProcessed;

                    // Send to API
                    const formData = new FormData();
                    formData.append('file', file);

                    try {
                        const response = await fetch('/analyze', {
                            method: 'POST',
                            body: formData
                        });
                        
                        const data = await response.json();
                        
                        // Update row with results
                        const row = document.getElementById(rowId);
                        
                        let severityBadge = '';
                        if(data.error) {
                            severityBadge = \`<span class="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded text-xs font-bold">ERROR</span>\`;
                        } else {
                            const sev = data.severity;
                            const colors = {
                                1: 'bg-green-500/20 text-green-400 border-green-500/30',
                                2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                3: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                4: 'bg-red-500/20 text-red-400 border-red-500/30',
                                5: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                            };
                            const c = colors[sev] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                            severityBadge = \`<span class="px-2.5 py-0.5 rounded text-xs font-bold border \${c}">Severity \${sev}</span>\`;
                        }
                        
                        row.innerHTML = \`
                            <td class="px-6 py-4">
                                <img src="\${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600">
                            </td>
                            <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="\${file.name}">\${file.name}</td>
                            <td class="px-6 py-4">\${severityBadge}</td>
                            <td class="px-6 py-4">
                                <pre class="bg-slate-900 p-3 rounded border border-slate-800 text-[10px] text-emerald-400 overflow-x-auto max-w-[400px] max-h-[120px] overflow-y-auto">\${JSON.stringify(data, null, 2)}</pre>
                            </td>
                        \`;
                    } catch (err) {
                        const row = document.getElementById(rowId);
                        row.innerHTML = \`
                            <td class="px-6 py-4">
                                <img src="\${previewUrl}" class="w-16 h-16 object-cover rounded opacity-50">
                            </td>
                            <td class="px-6 py-4 text-red-400">\${file.name}</td>
                            <td class="px-6 py-4"><span class="bg-red-900 text-red-300 px-2 rounded text-xs">TIMEOUT</span></td>
                            <td class="px-6 py-4 text-red-400 text-xs">Request failed: \${err.message}</td>
                        \`;
                    }
                }
                
                // Clear input so same files can be selected again if needed
                e.target.value = '';
            });
        </script>
    </body>
    </html>
    \"\"\"
"""

# Replace the original root endpoint
old_endpoint = """@app.get("/")
def health_check():
    return {"status": "PaveSafe AI Microservice is running online!"}"""

if old_endpoint in content:
    content = content.replace(old_endpoint, html_template)
    with open(file_path, 'w') as f:
        f.write(content)
    print("Replaced root endpoint with web interface.")
else:
    print("Old endpoint not found.")
