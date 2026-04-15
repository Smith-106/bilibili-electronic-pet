import { resolve, win32 } from 'node:path';

export function normalizeReportPath(reportPath: string, platform: NodeJS.Platform = process.platform): string {
  if (platform !== 'win32') {
    return reportPath;
  }

  const normalized = reportPath.replace(/\\/g, '/');
  const gitBashPathMatch = /^(?:[A-Za-z]:)?\/Program Files\/Git\/mnt\/([a-zA-Z])\/(.*)$/.exec(normalized);
  const wslPathMatch = /^\/mnt\/([a-zA-Z])\/(.*)$/.exec(normalized);
  const match = gitBashPathMatch ?? wslPathMatch;
  if (!match) {
    return reportPath;
  }

  const [, driveLetter, remainder] = match;
  const windowsRemainder = remainder.replace(/\//g, '\\');
  return `${driveLetter.toUpperCase()}:\\${windowsRemainder}`;
}

export function resolveReportOutputPath(
  reportPath: string,
  options: {
    currentWorkingDirectory?: string;
    initWorkingDirectory?: string;
    platform?: NodeJS.Platform;
  } = {},
): string {
  const baseDirectory = options.initWorkingDirectory ?? options.currentWorkingDirectory ?? process.cwd();
  const platform = options.platform ?? process.platform;
  const normalizedPath = normalizeReportPath(reportPath, platform);
  const normalizedBaseDirectory = normalizeReportPath(baseDirectory, platform);

  if (platform === 'win32') {
    return win32.isAbsolute(normalizedPath) ? normalizedPath : win32.resolve(normalizedBaseDirectory, normalizedPath);
  }

  return resolve(normalizedBaseDirectory, normalizedPath);
}
