 #!/bin/bash
cd "$(dirname "$0")"  # Change to the directory containing this script
set -a  # Automatically export all variables
source .env.local
set +a
python3.11 agent.py start