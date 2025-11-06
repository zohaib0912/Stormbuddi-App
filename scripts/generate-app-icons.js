const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, '../src/assets/images/logo.png');

// Android icon sizes (in pixels)
const androidSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// iOS icon sizes (in pixels)
const iosSizes = [
  { size: 40, name: 'Icon-App-20x20@2x.png' },      // 20x20 @2x
  { size: 60, name: 'Icon-App-20x20@3x.png' },      // 20x20 @3x
  { size: 58, name: 'Icon-App-29x29@2x.png' },      // 29x29 @2x
  { size: 87, name: 'Icon-App-29x29@3x.png' },      // 29x29 @3x
  { size: 80, name: 'Icon-App-40x40@2x.png' },      // 40x40 @2x
  { size: 120, name: 'Icon-App-40x40@3x.png' },     // 40x40 @3x
  { size: 120, name: 'Icon-App-60x60@2x.png' },     // 60x60 @2x
  { size: 180, name: 'Icon-App-60x60@3x.png' },     // 60x60 @3x
  { size: 1024, name: 'Icon-App-1024x1024.png' },   // Marketing icon
];

async function generateAndroidIcons() {
  console.log('Generating Android icons...');
  const androidDir = path.join(__dirname, '../android/app/src/main/res');
  
  for (const [folder, size] of Object.entries(androidSizes)) {
    const folderPath = path.join(androidDir, folder);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }
    
    // Generate square icon
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher.png'));
    
    // Generate round icon (same as square for now, Android will handle the mask)
    await sharp(logoPath)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(folderPath, 'ic_launcher_round.png'));
    
    console.log(`✓ Generated ${folder}/ic_launcher.png (${size}x${size})`);
  }
}

async function generateIosIcons() {
  console.log('Generating iOS icons...');
  const iosDir = path.join(__dirname, '../ios/StormBuddi/Images.xcassets/AppIcon.appiconset');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(iosDir)) {
    fs.mkdirSync(iosDir, { recursive: true });
  }
  
  for (const icon of iosSizes) {
    await sharp(logoPath)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(iosDir, icon.name));
    
    console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
  }
  
  // Update Contents.json to reference the generated icons
  updateIosContentsJson(iosDir);
}

function updateIosContentsJson(iosDir) {
  const contentsJson = {
    "images": [
      {
        "filename": "Icon-App-20x20@2x.png",
        "idiom": "iphone",
        "scale": "2x",
        "size": "20x20"
      },
      {
        "filename": "Icon-App-20x20@3x.png",
        "idiom": "iphone",
        "scale": "3x",
        "size": "20x20"
      },
      {
        "filename": "Icon-App-29x29@2x.png",
        "idiom": "iphone",
        "scale": "2x",
        "size": "29x29"
      },
      {
        "filename": "Icon-App-29x29@3x.png",
        "idiom": "iphone",
        "scale": "3x",
        "size": "29x29"
      },
      {
        "filename": "Icon-App-40x40@2x.png",
        "idiom": "iphone",
        "scale": "2x",
        "size": "40x40"
      },
      {
        "filename": "Icon-App-40x40@3x.png",
        "idiom": "iphone",
        "scale": "3x",
        "size": "40x40"
      },
      {
        "filename": "Icon-App-60x60@2x.png",
        "idiom": "iphone",
        "scale": "2x",
        "size": "60x60"
      },
      {
        "filename": "Icon-App-60x60@3x.png",
        "idiom": "iphone",
        "scale": "3x",
        "size": "60x60"
      },
      {
        "filename": "Icon-App-1024x1024.png",
        "idiom": "ios-marketing",
        "scale": "1x",
        "size": "1024x1024"
      }
    ],
    "info": {
      "author": "xcode",
      "version": 1
    }
  };
  
  fs.writeFileSync(
    path.join(iosDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  
  console.log('✓ Updated iOS Contents.json');
}

async function main() {
  try {
    // Check if logo exists
    if (!fs.existsSync(logoPath)) {
      console.error(`Error: Logo not found at ${logoPath}`);
      process.exit(1);
    }
    
    console.log(`Using logo: ${logoPath}`);
    console.log('');
    
    // Generate Android icons
    await generateAndroidIcons();
    console.log('');
    
    // Generate iOS icons
    await generateIosIcons();
    console.log('');
    
    console.log('✅ All app icons generated successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Rebuild your Android app to see the new icon');
    console.log('2. Rebuild your iOS app to see the new icon');
    console.log('3. For iOS: Open Xcode and verify icons in Images.xcassets');
    
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

main();

