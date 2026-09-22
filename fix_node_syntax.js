const fs = require('fs');
let code = fs.readFileSync('backend/server.js', 'utf8');

const badPart = `  });\r
    res.json(result.rows[0]);\r
  } catch { res.status(500).json({ error: 'Server error' }); }\r
});`;

const badPartLF = `  });\n    res.json(result.rows[0]);\n  } catch { res.status(500).json({ error: 'Server error' }); }\n});`;

code = code.replace(badPart, '  });');
code = code.replace(badPartLF, '  });');

fs.writeFileSync('backend/server.js', code);
console.log("Fixed");
