/**
 * Preview Service - Handles live preview and export functionality
 */
class PreviewService {
    constructor(bridgeService) {
        this.bridge = bridgeService;
        this.previewWindow = null;
        this.previewUrl = null;
        this.init();
    }

    init() {
        console.log('👁️ Initializing Preview Service...');
        
        // Listen for data changes to update preview
        this.bridge.on('dataChanged', this.updatePreview.bind(this));
        
        console.log('✅ Preview Service initialized');
    }

    openPreview() {
        try {
            // Close existing preview if open
            if (this.previewWindow && !this.previewWindow.closed) {
                this.previewWindow.close();
            }

            // Generate preview HTML
            const previewHTML = this.generatePreviewHTML();
            
            // Create new preview window
            this.previewWindow = window.open('', 'preview', 'width=1200,height=800,scrollbars=yes,resizable=yes');
            
            if (this.previewWindow) {
                this.previewWindow.document.write(previewHTML);
                this.previewWindow.document.close();
                
                // Focus the preview window
                this.previewWindow.focus();
                
                this.bridge.emit('previewOpened', { window: this.previewWindow });
                console.log('✅ Preview opened successfully');
                return { success: true };
            } else {
                throw new Error('Failed to open preview window (popup blocked?)');
            }
        } catch (error) {
            console.error('❌ Error opening preview:', error);
            this.bridge.emit('previewError', error);
            return { success: false, error: error.message };
        }
    }

    generatePreviewHTML() {
        const sections = this.bridge.getData('sections') || [];
        const theme = this.bridge.getData('theme') || {};
        
        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Preview</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        :root {
            --primary-color: ${theme.primaryColor || '#2563eb'};
            --secondary-color: ${theme.secondaryColor || '#1e40af'};
            --background-color: ${theme.backgroundColor || '#ffffff'};
            --text-color: ${theme.textColor || '#1f293b'};
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
        }
        
        .preview-section {
            min-height: 200px;
            padding: 20px;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .preview-section:last-child {
            border-bottom: none;
        }
        
        .preview-header {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-bottom: 1px solid #e5e7eb;
            padding: 10px 20px;
            z-index: 1000;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .preview-content {
            margin-top: 60px;
        }
        
        .preview-controls {
            display: flex;
            gap: 10px;
        }
        
        .preview-btn {
            padding: 8px 16px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .preview-btn:hover {
            background: #f9fafb;
            border-color: #9ca3af;
        }
        
        .preview-btn.primary {
            background: var(--primary-color);
            color: white;
            border-color: var(--primary-color);
        }
        
        .preview-btn.primary:hover {
            background: var(--secondary-color);
            border-color: var(--secondary-color);
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <div>
            <strong>Website Preview</strong>
            <span style="margin-left: 10px; color: #6b7280; font-size: 14px;">
                Generated: ${new Date().toLocaleString()}
            </span>
        </div>
        <div class="preview-controls">
            <button class="preview-btn" onclick="window.print()">Print</button>
            <button class="preview-btn primary" onclick="downloadHTML()">Download HTML</button>
            <button class="preview-btn" onclick="window.close()">Close</button>
        </div>
    </div>
    
    <div class="preview-content">`;

        // Add sections
        sections.forEach((section, index) => {
            html += `\n        <div class="preview-section" id="section-${index}">`;
            html += `\n            ${section.content || '<p>Empty section</p>'}`;
            html += `\n        </div>`;
        });

        html += `\n    </div>
    
    <script>
        function downloadHTML() {
            const html = document.documentElement.outerHTML;
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'website-${Date.now()}.html';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        // Add responsive behavior
        function updatePreview() {
            const sections = document.querySelectorAll('.preview-section');
            sections.forEach(section => {
                // Add responsive classes if needed
                section.classList.add('w-full');
            });
        }
        
        // Initialize preview
        updatePreview();
        
        // Update on resize
        window.addEventListener('resize', updatePreview);
    </script>
</body>
</html>`;

        return html;
    }

    updatePreview() {
        if (this.previewWindow && !this.previewWindow.closed) {
            try {
                const previewHTML = this.generatePreviewHTML();
                this.previewWindow.document.open();
                this.previewWindow.document.write(previewHTML);
                this.previewWindow.document.close();
                console.log('✅ Preview updated');
            } catch (error) {
                console.error('❌ Error updating preview:', error);
            }
        }
    }

    closePreview() {
        if (this.previewWindow && !this.previewWindow.closed) {
            this.previewWindow.close();
            this.previewWindow = null;
            this.bridge.emit('previewClosed');
            console.log('✅ Preview closed');
        }
    }

    async exportWebsite(format = 'html') {
        try {
            const sections = this.bridge.getData('sections') || [];
            const theme = this.bridge.getData('theme') || {};
            
            if (format === 'html') {
                const html = this.generateExportHTML(sections, theme);
                return {
                    success: true,
                    data: html,
                    filename: `website-export-${Date.now()}.html`,
                    mimeType: 'text/html'
                };
            } else if (format === 'json') {
                const data = {
                    sections,
                    theme,
                    metadata: {
                        exportedAt: new Date().toISOString(),
                        version: '1.0.0'
                    }
                };
                return {
                    success: true,
                    data: JSON.stringify(data, null, 2),
                    filename: `website-export-${Date.now()}.json`,
                    mimeType: 'application/json'
                };
            }
            
            return { success: false, error: 'Unsupported export format' };
        } catch (error) {
            console.error('❌ Error exporting website:', error);
            return { success: false, error: error.message };
        }
    }

    generateExportHTML(sections, theme) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Professional Website</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary-color: ${theme.primaryColor || '#2563eb'};
            --secondary-color: ${theme.secondaryColor || '#1e40af'};
            --background-color: ${theme.backgroundColor || '#ffffff'};
            --text-color: ${theme.textColor || '#1f293b'};
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background-color: var(--background-color);
            color: var(--text-color);
            line-height: 1.6;
        }
        
        .section {
            min-height: 200px;
            padding: 40px 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        @media (max-width: 768px) {
            .section {
                padding: 20px 10px;
            }
            
            .container {
                padding: 0 10px;
            }
        }
    </style>
</head>
<body>
    ${sections.map(section => `
    <div class="section" style="${section.styles || ''}">
        <div class="container">
            ${section.content || ''}
        </div>
    </div>`).join('\n')}
</body>
</html>`;
    }

    downloadFile(data, filename, mimeType) {
        try {
            const blob = new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            this.bridge.emit('fileDownloaded', { filename, mimeType });
            return { success: true };
        } catch (error) {
            console.error('❌ Error downloading file:', error);
            return { success: false, error: error.message };
        }
    }

    async publishWebsite(domain = null) {
        try {
            const exportResult = await this.exportWebsite('html');
            if (!exportResult.success) {
                throw new Error(exportResult.error);
            }

            // Here you would typically upload to a hosting service
            // For now, we'll just prepare the data
            const publishData = {
                html: exportResult.data,
                domain: domain,
                timestamp: new Date().toISOString(),
                status: 'ready'
            };

            // Save to Firebase if available
            if (this.bridge.firebase) {
                const saveResult = await this.bridge.saveToFirebase('published-websites', domain || 'default', publishData);
                if (saveResult.success) {
                    this.bridge.emit('websitePublished', publishData);
                    return { success: true, data: publishData };
                }
            }

            return { success: true, data: publishData };
        } catch (error) {
            console.error('❌ Error publishing website:', error);
            return { success: false, error: error.message };
        }
    }
}

// Make PreviewService available globally
window.PreviewService = PreviewService;
