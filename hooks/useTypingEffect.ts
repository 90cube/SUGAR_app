import { useState, useEffect } from 'react';

/**
 * useTypingEffect - Typewriter animation hook
 * Shows text character by character like typing
 * @param text - The full text to type out
 * @param speed - Milliseconds per character (default: 100ms)
 * @param enabled - Whether to start the animation (default: true)
 * @returns The current displayed text
 */
export const useTypingEffect = (text: string, speed: number = 100, enabled: boolean = true): string => {
    const [displayedText, setDisplayedText] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (!enabled) {
            setDisplayedText('');
            setCurrentIndex(0);
            return;
        }

        if (currentIndex < text.length) {
            const timer = setTimeout(() => {
                setDisplayedText(prev => prev + text[currentIndex]);
                setCurrentIndex(prev => prev + 1);
            }, speed);
            return () => clearTimeout(timer);
        }
    }, [currentIndex, text, speed, enabled]);

    useEffect(() => {
        // Reset when text changes
        setDisplayedText('');
        setCurrentIndex(0);
    }, [text]);

    return displayedText;
};
