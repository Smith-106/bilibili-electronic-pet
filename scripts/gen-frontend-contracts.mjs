#!/usr/bin/env node
/**
 * 契约单一真源生成器 (ISS: 前后端类型一致)
 *
 * 从后端 wire 契约源 backend-ts/src/server/contracts.ts 抽取导出类型，
 * 生成 frontend/src/lib/contracts.generated.ts 供 admin-api.ts 消费。
 *
 * - 纯类型输出，不含任何后端运行时 import → 前端 bundle 不引入后端依赖。
 * - 同输入同输出：同一 contracts.ts 产出逐字节一致的生成物。
 * - 前端读取的兼容别名字段 (后端 wire 不返回但页面防御性访问, 恒为 undefined)
 *   通过 `& { alias?: ... }` 交叉补充，真源字段仍全部来自后端契约。
 *
 * 用法: node scripts/gen-frontend-contracts.mjs   (或 npm run gen:contracts)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'backend-ts/src/server/contracts.ts');
const OUT = join(ROOT, 'frontend/src/lib/contracts.generated.ts');

// 需要从后端契约抽取的类型名 -> 前端导出别名
const WIRE_TYPES = [
  ['RoleCardValue', 'RoleCardValue'],
  ['AdminJobItem', 'AdminJobItem'],
  ['AdminBilibiliCredential', 'AdminBilibiliCredential'],
  ['BilibiliVideo', 'BackendBilibiliVideo'],
  ['RoleCard', 'BackendRoleCard'],
  ['MemorySpace', 'BackendMemorySpace'],
  ['MemoryItem', 'BackendMemoryItem'],
];

function extractType(source, name) {
  const marker = `export type ${name} = `;
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`contract type not found: ${name}`);
  const bodyStart = start + `export type `.length; // points at `X = ...`
  // 找到以 `};` 或 `;` 结尾的语句边界 (简单 brace 配平)
  let i = source.indexOf('=', bodyStart) + 1;
  const decl = source.slice(source.indexOf('=', start) + 1);
  // 类型体可能是 `= { ... }` (object) 或 `= 'a' | 'b'` (union) —— 用 brace 配平找结尾
  let depth = 0;
  let end = -1;
  for (let j = 0; j < decl.length; j++) {
    const c = decl[j];
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') depth--;
    else if (c === ';' && depth === 0) { end = j; break; }
  }
  if (end === -1) throw new Error(`unterminated contract type: ${name}`);
  return decl.slice(0, end).trim();
}

const source = readFileSync(SRC, 'utf8');
const parts = [];

parts.push(`// GENERATED FILE — DO NOT EDIT.
// 由 scripts/gen-frontend-contracts.mjs 从 backend-ts/src/server/contracts.ts 生成。
// 重新生成: npm run gen:contracts
`);

const extracted = {};
for (const [contractName] of WIRE_TYPES) {
  extracted[contractName] = extractType(source, contractName);
}

// 原样输出后端契约体 (作为具名内部类型), 再组合出前端消费名。
const renames = {
  BackendBilibiliVideo: 'BilibiliVideo',
  BackendRoleCard: 'RoleCard',
  BackendMemorySpace: 'MemorySpace',
  BackendMemoryItem: 'MemoryItem',
};

for (const [contractName, alias] of WIRE_TYPES) {
  const body = extracted[contractName];
  // 若前端导出别名与后端契约同名 (RoleCardValue/AdminJobItem/AdminBilibiliCredential) 直接输出;
  // 否则以后端契约名命名 (BilibiliVideo/RoleCard/MemorySpace/MemoryItem) 作为内部类型。
  const emitName = alias.startsWith('Backend') ? contractName : alias;
  parts.push(`export type ${emitName} = ${body};\n`);
}

// 前端消费别名: 后端 wire 字段 + 前端防御性别名 (恒为 undefined 的兼容读)。
parts.push(`/** admin-api Job 视图 = 后端 AdminJobItem wire。 */
export type Job = AdminJobItem;

/** admin-api BilibiliVideo 视图 = 后端 wire + 兼容别名 (video_id/enabled 恒为 undefined)。 */
export type BilibiliVideoView = BilibiliVideo & { video_id?: number; enabled?: boolean };

/** admin-api BilibiliCredential 视图 = 后端 wire + 兼容别名 (credential_id/active 恒为 undefined)。 */
export type BilibiliCredentialView = AdminBilibiliCredential & { credential_id?: number; active?: boolean };

/** admin-api RoleCard 视图 = 后端 wire + 兼容别名 (active 为 is_active 别名)。 */
export type RoleCardView = RoleCard & { active?: boolean };

/** admin-api MemorySpace 视图 = 后端 wire。 */
export type MemorySpaceView = MemorySpace;

/** admin-api MemoryItem 视图 = 后端 wire。 */
export type MemoryItemView = MemoryItem;
`);

writeFileSync(OUT, parts.join('\n'), 'utf8');
console.log(`generated ${OUT}`);
