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
});
