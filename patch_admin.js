const fs = require('fs');

let content = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

const rejectFunc = `
  const rejectHazard = async (id: number) => {
    if (!confirm('Are you sure you want to reject this report? This will deduct 20 points from the user. 5 consecutive rejections will ban them for 2 months.')) return;
    try {
      await axios.put(\`\${API_URL}/api/hazards/\${id}/status\`, { 
        status: 'Rejected'
      }, { headers: { Authorization: \`Bearer \${token}\` }});
      fetchHazards();
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Failed to reject hazard.');
    }
  };
`;

content = content.replace("const submitAssignment = async", rejectFunc + "\n  const submitAssignment = async");

const actionColOld = `                        <td className="p-4 space-x-2 flex">
                          <button 
                            onClick={() => openAssignModal(hazard.id)}
                            disabled={hazard.status === 'Resolved'}
                            className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md font-medium hover:bg-amber-200 disabled:opacity-50 transition-colors"
                          >
                            {hazard.status === 'In Progress' ? 'Reassign' : 'Dispatch'}
                          </button>
                          <button 
                            onClick={() => markResolved(hazard.id)}
                            disabled={hazard.status === 'Resolved' || hazard.status === 'Reported'}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-md font-medium hover:bg-green-200 disabled:opacity-50 transition-colors"
                          >
                            Resolve
                          </button>
                        </td>`;

const actionColNew = `                        <td className="p-4 space-x-2 flex flex-wrap gap-y-2 items-center">
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

if (content.includes("onClick={() => markResolved(hazard.id)}")) {
  content = content.replace(actionColOld, actionColNew);
}

// Add token to markResolved
content = content.replace(
  "await axios.put(`${API_URL}/api/hazards/${id}/status`, { status: 'Resolved' });", 
  "await axios.put(`${API_URL}/api/hazards/${id}/status`, { status: 'Resolved' }, { headers: { Authorization: `Bearer ${token}` }});"
);

// Add token to assign
content = content.replace(
  "deadline: deadline\n        });", 
  "deadline: deadline\n        }, { headers: { Authorization: `Bearer ${token}` }});"
);

fs.writeFileSync('frontend/src/app/admin/page.tsx', content);
console.log('Admin patch complete');
