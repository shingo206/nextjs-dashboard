import '@/app/ui/global.css';
import {inter} from '@/app/ui/fonts';
import React from 'react';

const RootLayout = ({children}: { children: React.ReactNode }) => (
    <html lang="en">
    <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
);
export default RootLayout;
