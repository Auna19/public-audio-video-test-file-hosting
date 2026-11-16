import './globals.css';

export const metadata = {
  title: 'Multilingual Audio & Video Test Library',
  description: 'Explore and access sample audio and video recordings in Nigerian languages (Hausa, Igbo, Yoruba, Nigerian Pidgin, and more) for speech-to-text, transcription, AI, and testing.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
