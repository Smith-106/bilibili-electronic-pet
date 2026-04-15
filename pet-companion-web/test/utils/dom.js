export function createPageContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

export async function flushPromises() {
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
