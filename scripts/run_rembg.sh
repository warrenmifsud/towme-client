#!/bin/bash
cd "$(dirname "$0")"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install requirements
echo "Installing/Checking requirements..."
pip install rembg pillow onnxruntime

# Run the python script with the provided arguments
python3 remove_bg.py "$@"
