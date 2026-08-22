export type ResolveTemplateOptions = {
  charName: string;
  userName: string;
};

export function resolveStoryTemplate(text: string, options: ResolveTemplateOptions): string {
  const { charName, userName } = options;
  return text
    .replace(/\{\{char\}\}/g, charName)
    .replace(/\{\{user\}\}/g, userName);
}
