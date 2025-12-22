document.addEventListener('DOMContentLoaded', () => {
    const body = document.body;
    const stage = document.getElementById('stage');
    
    // Configuration for sensitivity
    const rotateSensitivity = 15; // Degrees of rotation

    document.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        const w = window.innerWidth;
        const h = window.innerHeight;

        // Calculate rotation based on percentage of screen position
        // Top-Left should rotate X positive (tilt up), Y negative (tilt left)
        const moveX = (x / w) - 0.5; // -0.5 to 0.5
        const moveY = (y / h) - 0.5; // -0.5 to 0.5

        // In CSS rotateY, positive is right side coming forward (looking left)
        // In CSS rotateX, positive is bottom coming forward (looking down) - wait
        // Let's test: rotateX(20deg) tilts top back.
        // We want looking at top left -> tilts towards top left.
        
        const degY = moveX * rotateSensitivity; // Rotate around Y axis
        const degX = -moveY * rotateSensitivity; // Rotate around X axis

        // Apply transform to the stage
        stage.style.transform = `rotateX(${degX}deg) rotateY(${degY}deg)`;
    });

    // Mobile gyroscope support (optional, if device supports it)
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            const tiltX = e.beta; // -180 to 180
            const tiltY = e.gamma; // -90 to 90
            
            // Constrain
            if (tiltX && tiltY) {
                 // Simple mapping for portrait mode usually
                 // Can add more complex logic if needed
            }
        });
    }


    // --- Index Page: Download & Story Logic ---
    const btnDownload = document.getElementById('btn-download');
    
    if (btnDownload) {
        
        const loadAndShowChapter1 = async () => {
            try {
                const res = await fetch('/CTF_story.md', { cache: 'no-store' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const md = await res.text();
                
                // Use shared parser from dialog.js
                const parts = parseStoryMarkdown(md);
                if (parts && parts.ch1) {
                    openStoryModal(parts.ch1.title, parts.ch1.body);
                }

            } catch (e) {
                console.error('Failed to load story:', e);
            }
        };

        btnDownload.addEventListener('click', () => {
            setTimeout(loadAndShowChapter1, 500);
        });
    }
});
