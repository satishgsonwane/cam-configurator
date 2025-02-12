# Camera Calibration Utility

A web-based utility for calibrating and controlling camera positions in a sports field setting. This application allows users to manage camera configurations, control pan/tilt/zoom settings, and save preset positions for different landmarks.

## Features

- **Camera Control**
  - Pan control (-55° to 55°)
  - Tilt control (-20° to 20°)
  - Zoom control (0 to 16000)
  - Real-time validation of input values
  - Visual feedback for all operations

- **Configuration Management**
  - Import/Export camera configurations as JSON
  - Save preset positions for landmarks
  - Update existing configurations
  - Reset camera to default position (0°, 0°, 0)
  - Download current configuration state

- **User Interface**
  - Intuitive camera and landmark selection
  - Visual field representation
  - Confirmation dialogs for important actions
  - Toast notifications for operation feedback
  - Tooltips for better user guidance
  - Responsive design for different screen sizes

## Technology Stack

- **Frontend**
  - Next.js 14 (App Router)
  - React with TypeScript
  - Tailwind CSS for styling
  - Shadcn/ui Components
  - Sonner for Toast Notifications
  - Lucide React for icons

- **Backend**
  - Vercel Blob Storage for configuration persistence
  - REST API endpoints for configuration management
  - NATS messaging for camera control

## Getting Started

1. **Prerequisites**
   - Node.js 18+ installed
   - Access to venue network (for camera control)
   - Valid camera configuration file

2. **Installation**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Production Build**
   ```bash
   npm run build
   npm start
   # or
   yarn build
   yarn start
   ```

## Usage Guide

1. **Initial Setup**
   - Import a valid camera configuration file using the "Import Config" button
   - Configuration file should be in JSON format with camera and landmark data

2. **Camera Selection**
   - Choose a camera from the dropdown menu
   - Select a landmark position to load its preset values

3. **Position Control**
   - Adjust Pan value (-55° to 55°)
   - Adjust Tilt value (-20° to 20°)
   - Set Zoom level (0 to 16000)
   - All inputs have real-time validation

4. **Camera Operations**
   - Click "Boom ! Bam!" to move camera to specified position
   - Use "Recenter" to reset camera to default position (0°, 0°, 0)
   - Save configuration to store current settings
   - Download configuration for backup

## API Endpoints

- `GET /api/config` - Retrieve current camera configurations
- `POST /api/move` - Send camera movement commands
- `POST /api/update` - Update camera configurations
- `POST /api/import` - Import configuration file

## Error Handling

The application includes comprehensive error handling:
- Input validation for all camera controls
- Confirmation dialogs for critical operations
- Toast notifications for success/error feedback
- Graceful error recovery
- Network error handling
