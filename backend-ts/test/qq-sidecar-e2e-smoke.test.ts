import { describe, expect, it } from 'vitest';

import { normalizeReportPath, resolveReportOutputPath } from '../../qq-sidecar/src/report-path.js';

describe('qq-sidecar e2e smoke report path normalization', () => {
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

  it('keeps Windows-native paths unchanged on win32', () => {
    expect(normalizeReportPath('D:\\workspace\\report.json', 'win32')).toBe('D:\\workspace\\report.json');
  });

  it('falls back to current working directory when INIT_CWD is absent', () => {
    expect(
      resolveReportOutputPath('./.artifacts/staging/report.json', {
        currentWorkingDirectory: 'D:\\repo\\backend-ts',
        platform: 'win32',
      }),
    ).toBe('D:\\repo\\backend-ts\\.artifacts\\staging\\report.json');
  });
});
