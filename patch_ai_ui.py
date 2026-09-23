import re

file_path = 'ai-service/main.py'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the HTMLResponse block
pattern = re.compile(r'(@app\.get\("/", response_class=HTMLResponse\)\s*def web_interface\(\):\s*return """)(.*?)(""")', re.DOTALL)

new_html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PaveSafe AI Microservice | Tester</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            .loader { border-top-color: #3b82f6; -webkit-animation: spinner 1.5s linear infinite; animation: spinner 1.5s linear infinite; }
            @keyframes spinner { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    </head>
    <body class="bg-slate-900 text-slate-100 min-h-screen p-8 font-sans">
        <div class="max-w-6xl mx-auto">
            <header class="mb-8 border-b border-slate-700 pb-4 flex justify-between items-center flex-wrap gap-4">
                <h1 class="text-3xl font-bold text-white flex items-center gap-3">
                    <svg class="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    PaveSafe AI Tester
                </h1>
                <div class="bg-slate-800 border border-slate-600 rounded-lg p-2 px-4 text-sm text-slate-300 flex items-center gap-3 shadow-lg">
                    <span id="imu-status" class="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                    <span id="pitch-display" class="font-mono font-bold">IMU Pitch: Waiting...</span>
                </div>
            </header>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <!-- Dropzone (Gallery/Desktop) -->
                <div class="flex items-center justify-center w-full">
                    <label for="dropzone-file" class="flex flex-col items-center justify-center w-full h-48 border-2 border-slate-600 border-dashed rounded-xl cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg aria-hidden="true" class="w-10 h-10 mb-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            <p class="mb-2 text-sm text-slate-300"><span class="font-semibold text-blue-400">Desktop / Gallery Upload</span></p>
                            <p class="text-xs text-slate-500">Heuristic Scaling</p>
                        </div>
                        <input id="dropzone-file" type="file" class="hidden" multiple accept="image/*" />
                    </label>
                </div>
                
                <!-- Live Camera (Mobile Only) -->
                <div class="flex items-center justify-center w-full">
                    <label for="camera-file" class="flex flex-col items-center justify-center w-full h-48 border-2 border-emerald-500 border-dashed rounded-xl cursor-pointer bg-slate-800 hover:bg-slate-700 transition-colors shadow-lg">
                        <div class="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg class="w-10 h-10 mb-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <p class="mb-2 text-sm text-slate-300"><span class="font-semibold text-emerald-400">Live Camera Upload</span></p>
                            <p class="text-xs text-emerald-500/70">Locks to rear camera + Sends IMU sensor data</p>
                        </div>
                        <input id="camera-file" type="file" class="hidden" accept="image/*" capture="environment" />
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
                                <th scope="col" class="px-6 py-4">Source & File</th>
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
            let currentPitch = -15; // default fallback
            let imuActive = false;
            
            // Listen to device motion (Mobile)
            window.addEventListener("deviceorientation", (event) => {
                if (event.beta !== null) {
                    currentPitch = event.beta;
                    if(!imuActive) {
                        imuActive = true;
                        document.getElementById('imu-status').classList.replace('bg-red-500', 'bg-emerald-500');
                    }
                    document.getElementById('pitch-display').innerText = 'IMU Pitch: ' + Math.round(event.beta) + '°';
                }
            });

            const resultsContainer = document.getElementById('results-container');
            const resultsTable = document.getElementById('results-table');
            const countBadge = document.getElementById('count-badge');
            
            let totalProcessed = 0;

            async function processFiles(files, isLiveCamera) {
                if(files.length === 0) return;
                resultsContainer.classList.remove('hidden');
                
                for(let i=0; i<files.length; i++) {
                    const file = files[i];
                    const rowId = 'row-' + Math.random().toString(36).substr(2, 9);
                    const previewUrl = URL.createObjectURL(file);
                    
                    const sourceTag = isLiveCamera 
                        ? '<span class="bg-emerald-900 text-emerald-300 px-2 py-0.5 rounded text-[10px] font-bold mb-1 inline-block">LIVE IMU</span>'
                        : '<span class="bg-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold mb-1 inline-block">HEURISTIC</span>';
                    
                    const tr = document.createElement('tr');
                    tr.id = rowId;
                    tr.className = 'border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors';
                    tr.innerHTML = `
                        <td class="px-6 py-4"><img src="${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600"></td>
                        <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="${file.name}">
                            ${sourceTag}<br>${file.name}
                        </td>
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
                    `;
                    resultsTable.insertBefore(tr, resultsTable.firstChild);
                    
                    totalProcessed++;
                    countBadge.innerText = totalProcessed;

                    const formData = new FormData();
                    formData.append('file', file);
                    
                    // Bundle Live IMU Metadata!
                    const metadata = {
                        camera_height_m: 1.08,
                        camera_pitch_degrees: Math.round(currentPitch),
                        scale_source: isLiveCamera ? "imu_measured" : "heuristic_pixel_ratio"
                    };
                    formData.append('metadata', JSON.stringify(metadata));

                    try {
                        const response = await fetch('/analyze', { method: 'POST', body: formData });
                        const data = await response.json();
                        
                        const row = document.getElementById(rowId);
                        let severityBadge = '';
                        if(data.error) {
                            severityBadge = `<span class="bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded text-xs font-bold">ERROR</span>`;
                        } else {
                            const sev = data.severity;
                            const colors = {
                                1: 'bg-green-500/20 text-green-400 border-green-500/30',
                                2: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
                                4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                5: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                                7: 'bg-red-500/20 text-red-400 border-red-500/30',
                                8: 'bg-red-600/30 text-red-300 border-red-500/50',
                                9: 'bg-purple-500/30 text-purple-300 border-purple-500/50',
                                10: 'bg-purple-600/40 text-purple-200 border-purple-500/50'
                            };
                            const c = colors[sev] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
                            severityBadge = `<span class="px-2.5 py-0.5 rounded text-xs font-bold border ${c}">Severity ${sev}</span>`;
                        }
                        
                        row.innerHTML = `
                            <td class="px-6 py-4"><img src="${previewUrl}" class="w-16 h-16 object-cover rounded shadow-lg border border-slate-600"></td>
                            <td class="px-6 py-4 font-medium text-white max-w-[200px] truncate" title="${file.name}">
                                ${sourceTag}<br>${file.name}
                            </td>
                            <td class="px-6 py-4">${severityBadge}</td>
                            <td class="px-6 py-4">
                                <pre class="bg-slate-900 p-3 rounded border border-slate-800 text-[10px] text-emerald-400 overflow-x-auto max-w-[400px] max-h-[120px] overflow-y-auto">${JSON.stringify(data, null, 2)}</pre>
                            </td>
                        `;
                    } catch (err) {
                        const row = document.getElementById(rowId);
                        row.innerHTML = `
                            <td class="px-6 py-4"><img src="${previewUrl}" class="w-16 h-16 object-cover rounded opacity-50"></td>
                            <td class="px-6 py-4 text-red-400">${sourceTag}<br>${file.name}</td>
                            <td class="px-6 py-4"><span class="bg-red-900 text-red-300 px-2 rounded text-xs">TIMEOUT</span></td>
                            <td class="px-6 py-4 text-red-400 text-xs">Request failed: ${err.message}</td>
                        `;
                    }
                }
            }

            document.getElementById('dropzone-file').addEventListener('change', (e) => { processFiles(e.target.files, false); e.target.value = ''; });
            document.getElementById('camera-file').addEventListener('change', (e) => { processFiles(e.target.files, true); e.target.value = ''; });
        </script>
    </body>
    </html>
"""

def replacement(match):
    return match.group(1) + new_html + match.group(3)

content = pattern.sub(replacement, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated HTML UI in ai-service/main.py")
