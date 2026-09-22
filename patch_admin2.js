const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

const regex = /<td className="p-4 space-x-2 flex">([\s\S]*?)<\/td>/;

const newCol = `<td className="p-4 space-x-2 flex flex-wrap gap-y-2 items-center">
                          {hazard.image_url && (
                            <button 
                              onClick={() => window.open(hazard.image_url, '_blank')}
                              className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-md font-medium hover:bg-blue-200 transition-colors flex items-center gap-1"
                            >
                              Photo
                            </button>
                          )}
                          <button 
                            onClick={() => openAssignModal(hazard.id)}
                            disabled={hazard.status === 'Resolved' || hazard.status === 'Rejected'}
                            className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
                          >
                            {hazard.status === 'In Progress' ? 'Reassign' : 'Dispatch'}
                          </button>
                          <button 
                            onClick={() => markResolved(hazard.id)}
                            disabled={hazard.status === 'Resolved' || hazard.status === 'Reported' || hazard.status === 'Rejected'}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                          >
                            Resolve
                          </button>
                          {hazard.status === 'Reported' && (
                            <button 
                              onClick={() => rejectHazard(hazard.id)}
                              className="text-xs bg-red-100 text-red-700 px-3 py-1.5 rounded-md font-medium hover:bg-red-200 transition-colors"
                            >
                              Reject
                            </button>
                          )}
                        </td>`;

content = content.replace(regex, newCol);

fs.writeFileSync('frontend/src/app/admin/page.tsx', content);
console.log('Action column patched');
