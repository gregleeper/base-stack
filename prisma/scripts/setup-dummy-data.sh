#!/bin/bash

# Script to set up dummy data for the resource scheduling application
# This script is a wrapper that runs the TypeScript version of the setup script

# Ensure script is run from project root
if [ ! -f "./package.json" ]; then
  echo "Error: Please run this script from the project root directory."
  exit 1
fi

# Execute the TypeScript file using tsx
npx tsx ./prisma/scripts/setup-dummy-data.ts

# Exit with the same code as the TypeScript file
exit $?