# Camera Calibration Utility

A web-based utility for calibrating and controlling camera positions in a sports field setting. This application allows users to manage camera configurations, control pan/tilt/zoom settings, and save preset positions for different landmarks.

## Features

- **Camera Control**
  - Pan control (-55° to 55°)
  - Tilt control (-20° to 20°)
  - Zoom control (0 to 16000)
  - Real-time validation of input values

- **Configuration Management**
  - Import/Export camera configurations
  - Save preset positions for landmarks
  - Update existing configurations
  - Reset camera to default position

- **User Interface**
  - Intuitive camera and landmark selection
  - Visual feedback for actions (success/error notifications)
  - Field visualization
  - Responsive design for different screen sizes

## Technology Stack

- **Frontend**
  - Next.js 14
  - React
  - TypeScript
  - Tailwind CSS
  - Shadcn/ui Components
  - Sonner for Toast Notifications

- **API**
  - REST API endpoints for configuration management
  - NATS messaging for camera control

## Getting Started

1. **Preparation**
   
   Make sure you are tunneled into the venue before using this utility.
   
2. **Installation**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   # or
   yarn build
   ```

## Usage

1. **Select Camera and Landmark**
   - Choose a camera from the dropdown
   - Select a landmark position

2. **Adjust Camera Position**
   - Enter Pan value (-55° to 55°)
   - Enter Tilt value (-20° to 20°)
   - Set Zoom level (0 to 16000)

3. **Control Options**
   - Click "Boom ! Bam!" to move camera to specified position
   - Use "Recenter" to reset camera position
   - Save configuration to store current settings
   - Import/Export configurations as needed

## API Endpoints

- `GET /api/config` - Retrieve camera configurations
- `POST /api/move` - Send camera movement commands
- `POST /api/update` - Update camera configurations
- `POST /api/import` - Import configuration file

## Error Handling

The application includes comprehensive error handling:
- Input validation for pan/tilt/zoom values
- Error notifications for failed operations
- Success confirmations for completed actions
