# Create a development environment check
if [ ! -f .env ]; then
  echo 'Creating .env from template...'
  cp env.example .env
  echo 'Please update .env with your actual values'
fi
