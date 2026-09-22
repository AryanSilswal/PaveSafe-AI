const fs = require('fs');
let c = fs.readFileSync('frontend/src/app/admin/page.tsx', 'utf8');

c = c.replace(
  'const [showExportModal, setShowExportModal] = useState(false);',
  'const [showExportModal, setShowExportModal] = useState(false);\n  const [previewImage, setPreviewImage] = useState<string | null>(null);'
);

const modalHTML = `
      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 text-white bg-black/50 p-2 rounded-full hover:bg-black/70"><X size={24}/></button>
          <img src={previewImage} alt="Hazard Preview" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
        </div>
      )}
`;

c = c.replace('{/* Export Modal */}', modalHTML + '\n      {/* Export Modal */}');

c = c.replace(
  /onClick=\{\(\) => window\.open\(hazard\.image_url, '_blank'\)\}/g,
  'onClick={() => setPreviewImage(hazard.image_url)}'
);

fs.writeFileSync('frontend/src/app/admin/page.tsx', c);
console.log("Patched!");
