const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../app/actions.ts');
let content = fs.readFileSync(targetPath, 'utf-8');

// Replace import
content = content.replace(
  'import { getSupabaseAdminClient } from "@/src/lib/supabase";',
  'import { createSupabaseServerComponentClient } from "@/src/lib/supabase";'
);

// Replace client initialization
// The pattern is usually `const admin = getSupabaseAdminClient();`
content = content.replace(
  /const\s+admin\s*=\s*getSupabaseAdminClient\(\);/g,
  'const admin = await createSupabaseServerComponentClient();'
);

// We keep the variable name `admin` to avoid renaming hundreds of `admin.from("x")` calls.
// However, the check `if (!admin) throw new Error("Supabase admin client no disponible.");` can stay 
// or be updated slightly:
content = content.replace(
  /throw new Error\("Supabase admin client no disponible\."\);/g,
  'throw new Error("Supabase client no disponible.");'
);

fs.writeFileSync(targetPath, content, 'utf-8');
console.log('Refactoring actions.ts complete.');
