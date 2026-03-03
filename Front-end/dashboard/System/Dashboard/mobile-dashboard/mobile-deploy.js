// Mobile Deployment Script for MADAS Dashboard
console.log('📱 Mobile deployment script loaded');

// Mobile Deployment Configuration
const mobileDeployConfig = {
    // Firebase Hosting Configuration
    firebase: {
        projectId: 'madas-store',
        hosting: {
            public: 'simple-website/Dashboard',
            ignore: [
                'firebase.json',
                '**/.*',
                '**/node_modules/**'
            ],
            rewrites: [
                {
                    source: '**',
                    destination: '/index.html'
                }
            ],
            headers: [
                {
                    source: '**/*.@(js|css)',
                    headers: [
                        {
                            key: 'Cache-Control',
                            value: 'max-age=31536000'
                        }
                    ]
                },
                {
                    source: '**/*.@(png|jpg|jpeg|gif|svg|ico)',
                    headers: [
                        {
                            key: 'Cache-Control',
                            value: 'max-age=31536000'
                        }
                    ]
                }
            ]
        }
    },
    
    // Netlify Configuration
    netlify: {
        build: {
            publish: 'simple-website/Dashboard',
            command: 'echo "No build step required"'
        },
        redirects: [
            {
                from: '/*',
                to: '/index.html',
                status: 200
            }
        ],
        headers: [
            {
                for: '/*',
                values: {
                    'X-Frame-Options': 'DENY',
                    'X-XSS-Protection': '1; mode=block',
                    'X-Content-Type-Options': 'nosniff',
                    'Referrer-Policy': 'strict-origin-when-cross-origin'
                }
            }
        ]
    },
    
    // Vercel Configuration
    vercel: {
        version: 2,
        builds: [
            {
                src: 'simple-website/Dashboard/**/*',
                use: '@vercel/static'
            }
        ],
        routes: [
            {
                src: '/(.*)',
                dest: '/index.html'
            }
        ]
    }
};

// Mobile Deployment Functions
class MobileDeployer {
    constructor() {
        this.deploymentOptions = ['firebase', 'netlify', 'vercel', 'github-pages'];
        this.currentOption = 'firebase';
    }

    // Generate deployment files
    generateDeploymentFiles() {
        console.log('🔧 Generating deployment files...');
        
        // Generate firebase.json
        this.generateFirebaseConfig();
        
        // Generate netlify.toml
        this.generateNetlifyConfig();
        
        // Generate vercel.json
        this.generateVercelConfig();
        
        // Generate GitHub Pages config
        this.generateGitHubPagesConfig();
        
        console.log('✅ Deployment files generated');
    }

    // Generate Firebase configuration
    generateFirebaseConfig() {
        const firebaseConfig = {
            hosting: mobileDeployConfig.firebase.hosting
        };
        
        const fs = require('fs');
        fs.writeFileSync('firebase.json', JSON.stringify(firebaseConfig, null, 2));
        console.log('📄 firebase.json created');
    }

    // Generate Netlify configuration
    generateNetlifyConfig() {
        const netlifyConfig = `[build]
  publish = "simple-website/Dashboard"
  command = "echo 'No build step required'"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"`;
        
        const fs = require('fs');
        fs.writeFileSync('netlify.toml', netlifyConfig);
        console.log('📄 netlify.toml created');
    }

    // Generate Vercel configuration
    generateVercelConfig() {
        const vercelConfig = mobileDeployConfig.vercel;
        
        const fs = require('fs');
        fs.writeFileSync('vercel.json', JSON.stringify(vercelConfig, null, 2));
        console.log('📄 vercel.json created');
    }

    // Generate GitHub Pages configuration
    generateGitHubPagesConfig() {
        const githubPagesConfig = `# GitHub Pages Configuration for MADAS Dashboard

## Setup Instructions

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select source: Deploy from a branch
4. Select branch: main
5. Select folder: /simple-website/Dashboard
6. Save and wait for deployment

## Custom Domain (Optional)

1. Add a CNAME file in /simple-website/Dashboard with your domain
2. Configure DNS records as instructed by GitHub Pages

## HTTPS

GitHub Pages automatically provides HTTPS for custom domains.`;
        
        const fs = require('fs');
        fs.writeFileSync('GITHUB_PAGES_SETUP.md', githubPagesConfig);
        console.log('📄 GITHUB_PAGES_SETUP.md created');
    }

    // Deploy to Firebase
    async deployToFirebase() {
        console.log('🔥 Deploying to Firebase...');
        
        try {
            // Check if Firebase CLI is installed
            const { exec } = require('child_process');
            
            exec('firebase --version', (error, stdout, stderr) => {
                if (error) {
                    console.log('❌ Firebase CLI not found. Please install it first:');
                    console.log('npm install -g firebase-tools');
                    return;
                }
                
                console.log('✅ Firebase CLI found');
                console.log('🚀 Run these commands to deploy:');
                console.log('1. firebase login');
                console.log('2. firebase init hosting');
                console.log('3. firebase deploy');
            });
        } catch (error) {
            console.error('❌ Firebase deployment error:', error);
        }
    }

    // Deploy to Netlify
    async deployToNetlify() {
        console.log('🌐 Deploying to Netlify...');
        
        console.log('📋 Netlify Deployment Steps:');
        console.log('1. Go to https://netlify.com');
        console.log('2. Click "New site from Git"');
        console.log('3. Connect your GitHub repository');
        console.log('4. Set build command: echo "No build required"');
        console.log('5. Set publish directory: simple-website/Dashboard');
        console.log('6. Deploy!');
    }

    // Deploy to Vercel
    async deployToVercel() {
        console.log('▲ Deploying to Vercel...');
        
        console.log('📋 Vercel Deployment Steps:');
        console.log('1. Install Vercel CLI: npm i -g vercel');
        console.log('2. Run: vercel login');
        console.log('3. Run: vercel --prod');
        console.log('4. Follow the prompts');
    }

    // Deploy to GitHub Pages
    async deployToGitHubPages() {
        console.log('📚 Deploying to GitHub Pages...');
        
        console.log('📋 GitHub Pages Deployment Steps:');
        console.log('1. Push your code to GitHub');
        console.log('2. Go to repository Settings > Pages');
        console.log('3. Select source: Deploy from a branch');
        console.log('4. Select branch: main');
        console.log('5. Select folder: /simple-website/Dashboard');
        console.log('6. Save and wait for deployment');
    }

    // Get deployment instructions
    getDeploymentInstructions() {
        return {
            firebase: {
                name: 'Firebase Hosting',
                steps: [
                    'Install Firebase CLI: npm install -g firebase-tools',
                    'Login: firebase login',
                    'Initialize: firebase init hosting',
                    'Deploy: firebase deploy'
                ],
                url: 'https://console.firebase.google.com'
            },
            netlify: {
                name: 'Netlify',
                steps: [
                    'Go to https://netlify.com',
                    'Click "New site from Git"',
                    'Connect your GitHub repository',
                    'Set publish directory: simple-website/Dashboard',
                    'Deploy!'
                ],
                url: 'https://netlify.com'
            },
            vercel: {
                name: 'Vercel',
                steps: [
                    'Install Vercel CLI: npm i -g vercel',
                    'Login: vercel login',
                    'Deploy: vercel --prod'
                ],
                url: 'https://vercel.com'
            },
            github: {
                name: 'GitHub Pages',
                steps: [
                    'Push code to GitHub',
                    'Go to Settings > Pages',
                    'Select source: Deploy from a branch',
                    'Select folder: /simple-website/Dashboard',
                    'Save and wait for deployment'
                ],
                url: 'https://github.com'
            }
        };
    }

    // Show deployment options
    showDeploymentOptions() {
        console.log('🚀 Mobile Deployment Options:');
        console.log('');
        
        const instructions = this.getDeploymentInstructions();
        
        Object.keys(instructions).forEach(option => {
            const config = instructions[option];
            console.log(`📱 ${config.name}:`);
            console.log(`   URL: ${config.url}`);
            console.log('   Steps:');
            config.steps.forEach((step, index) => {
                console.log(`   ${index + 1}. ${step}`);
            });
            console.log('');
        });
    }
}

// Initialize mobile deployer
const mobileDeployer = new MobileDeployer();

// Export for use
window.mobileDeployer = mobileDeployer;
window.MobileDeployer = MobileDeployer;

// Auto-show deployment options
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('mobile-connectivity')) {
        mobileDeployer.showDeploymentOptions();
    }
});
