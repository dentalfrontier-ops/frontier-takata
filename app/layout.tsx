import './globals.css';

export const metadata = {
  title: 'フロンティア',
  description: '訪問歯科支援センターフロンティア'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="ja"><body>{children}</body></html>;
}
