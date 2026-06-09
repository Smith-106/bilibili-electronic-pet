import { resolve, win32 } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeReportPath, resolveReportOutputPath } from '../src/report-path.js';

describe('onebot smoke report path normalization', () => {
  it('converts WSL /mnt paths to Windows paths on win32', () => {
    expect(normalizeReportPath('/mnt/d/工作目录/bilibili电子宠物/.artifacts/staging/report.json', 'win32')).toBe(
      'D:\\工作目录\\bilibili电子宠物\\.artifacts\\staging\\report.json',
    );
  });

  it('converts Git Bash mounted paths to Windows paths on win32', () => {
    expect(normalizeReportPath('C:/Program Files/Git/mnt/d/workspace/report.json', 'win32')).toBe(
      'D:\\workspace\\report.json',
    );
  });

  it('keeps paths unchanged outside win32 normalization mode', () => {
    expect(normalizeReportPath('/mnt/d/workspace/report.json', 'linux')).toBe('/mnt/d/workspace/report.json');
  });

  it('resolves relative report paths against INIT_CWD when provided', () => {
    expect(
      resolveReportOutputPath('./.artifacts/staging/report.json', {
        currentWorkingDirectory: 'D:\\repo\\qq-sidecar',
        initWorkingDirectory: 'D:\\repo',
        platform: 'win32',
      }),
    ).toBe('D:\\repo\\.artifacts\\staging\\report.json');
  });

  it('keeps absolute Windows report paths unchanged', () => {
    expect(
      resolveReportOutputPath('D:\\reports\\onebot.json', {
        currentWorkingDirectory: 'D:\\repo',
        platform: 'win32',
      }),
    ).toBe('D:\\reports\\onebot.json');
  });

  it('resolves relative report paths against cwd on non-Windows platforms', () => {
    expect(
      resolveReportOutputPath('./.artifacts/staging/report.json', {
        currentWorkingDirectory: '/repo/qq-sidecar',
        platform: 'linux',
      }),
    ).toBe(resolve('/repo/qq-sidecar', './.artifacts/staging/report.json'));
  });

  it('uses process defaults when no path options are provided', () => {
    expect(resolveReportOutputPath('report.json')).toBe(win32.resolve(process.cwd(), 'report.json'));
  });
});
