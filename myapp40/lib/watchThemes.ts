import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';

let started = false;

export function watchThemes() {
  if (started) return;
  started = true;

  const themesDir = path.join(process.cwd(), 'app/usersui/[username]/_components/themes');
  const indexFile = path.join(themesDir, 'index.ts');
  const namesFile = path.join(themesDir, 'themeNames.ts');

  const generate = () => {
    try {
      const entries = fs.readdirSync(themesDir, { withFileTypes: true });
      const folders = entries.filter(d => d.isDirectory()).map(d => d.name);

      let imports = '';
      let registry = '';
      let validFolders: string[] = [];

      for (const folderName of folders) {
        const folderPath = path.join(themesDir, folderName);
        try {
          const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.tsx'));
          if (!files.length) continue;

          const fileName = files[0];
          const fullPath = path.join(folderPath, fileName);
          const stat = fs.statSync(fullPath);
          if (stat.size === 0) continue; // ✅ 빈 파일이면 스킵 (복사 중) / Skip if empty file (copying)

          const fileBase = fileName.replace(/\.tsx$/, '');
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (!content.includes('export')) continue; // ✅ export 없으면 스킵 / Skip if there is no export.

          const match = content.match(/export\s+(?:function|const)\s+(\w+)/);
          const exported = match? match[1] : fileBase;

          imports += `import { ${exported} } from './${folderName}/${fileBase}';\n`;
          registry += ` ${folderName}: { component: ${exported}, label: '${folderName}' },\n`;
          validFolders.push(folderName);
        } catch { continue; } // 폴더 읽기 실패하면 스킵 / Skip if folder reading fails
      }
      
      // write code to index.ts themeName.ts files
      const indexContent = `${imports}
export const themeRegistry = {
${registry}} as const;
export type ThemeName = keyof typeof themeRegistry;
export function getThemeComponent(name: ThemeName) {
  return themeRegistry[name]?.component;
}
`;
      const namesContent = `export const themeNames = ${JSON.stringify(validFolders)} as const;
export type ThemeName = typeof themeNames[number];
`;

      // 내용 다를 때만 쓰기 / Use only when the content differs.
      if (!fs.existsSync(indexFile) || fs.readFileSync(indexFile, 'utf-8')!== indexContent) {
        fs.writeFileSync(indexFile, indexContent);
      }
      if (!fs.existsSync(namesFile) || fs.readFileSync(namesFile, 'utf-8')!== namesContent) {
        fs.writeFileSync(namesFile, namesContent);
      }
      console.log(`✅ themes: [ '${validFolders.join("', '")}' ]`);
    } catch (e) { console.error(e); }
  };

  generate();

  if (process.env.NODE_ENV!== 'production') {
    let t: NodeJS.Timeout;
    chokidar.watch(themesDir, {
      depth: 1,
      ignoreInitial: true,
      ignored: (p: string) => {
        const b = path.basename(p);
        return b === 'index.ts' || b === 'themeNames.ts';
      }
    }).on('all', (event) => {
      // addDir, unlinkDir, add, unlink 모두 감지
      clearTimeout(t);
      t = setTimeout(generate, 1000); // ✅ 1초 대기 / Wait 1 second
    });
  }
}