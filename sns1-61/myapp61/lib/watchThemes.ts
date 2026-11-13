// ✅ myapp58
// lib/watchThemes.ts

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
      let registryLines = ''; // ✅ myapp58

      let imports = '';
      let registry = '';
      let validFolders: string[] = [];

      for (const folderName of folders) {
        const folderPath = path.join(themesDir, folderName);
        try {
          let files = fs.readdirSync(folderPath).filter(f => f.endsWith('.tsx'));
          if (!files.length) continue;

          // ✅ myapp43 - followerlist,followinglist 파일 스킵 / Skip followerlist and followinglist files.
          files = files.filter(f =>!f.toLowerCase().includes('list'));
          if (!files.length) continue; // false -> continue

          // ✅ myapp43 + myapp60 - MainTheme.tsx로 정렬 / Sort by MainTheme.tsx
          files.sort((a,b) => {
            const aIsTheme = a.toLowerCase().includes('maintheme')? 0 : 1;
            const bIsTheme = b.toLowerCase().includes('maintheme')? 0 : 1;
            return aIsTheme - bIsTheme;
          });

          const fileName = files[0];
          const fullPath = path.join(folderPath, fileName);
          const stat = fs.statSync(fullPath);
          if (stat.size < 100) continue; // ✅ myapp60 - 빈 파일이면 스킵 (복사 중) / Skip if empty file (copying)

          const fileBase = fileName.replace(/\.tsx$/, '');
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (!content.includes('export')) continue; // ✅ export 없으면 스킵 / Skip if there is no export.

          const match = content.match(/export\s+(?:function|const)\s+(\w+)/);
          const exported = match? match[1] : fileBase;

          imports += `import { ${exported} as ${folderName}Comp} from './${folderName}/${fileBase}';\n`;
          registry += ` ${folderName}: { component: ${folderName}Comp, label: '${folderName}' },\n`;
          validFolders.push(folderName);

          // ✅ myapp58 - deprecated
          // -  pinafore는 _Fallback 
          // if (folderName === 'pinafore') {
          //   registryLines += ` pinafore: { component: _Fallback, label: 'pinafore' },\n`;
          // } else {
            // ✅ 정적 import 안함, require를 try/catch + eval로 감싸서 번들러가 파일 없어도 에러 안 내게
            //registryLines += ` ${folderName}: { component: _load('./${folderName}/${fileBase}', '${exported}'), label: '${folderName}' },\n`;
          //}

        } catch { continue; } // 폴더 읽기 실패하면 스킵 / Skip if folder reading fails
      }

      // write code to index.ts themeName.ts files
      const indexContent = `'use client';\n ${imports}
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

  // ✅ myapp60
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
      // Check addDir, unlinkDir, add, unlink
      clearTimeout(t);
      t = setTimeout(generate, 1000); // ✅ 1초 대기 / Wait 1 second
    });
  }
}