# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-01-05

### Added
- ✅ Health check endpoint (`GET /health`) for server monitoring
- ✅ Docker support with Dockerfile and docker-compose.yml
- ✅ Nginx reverse proxy configuration for production deployment
- ✅ Comprehensive README with setup instructions
- ✅ Deployment script (`deploy.sh`) for easier setup
- ✅ `.env.example` file for environment configuration
- ✅ `.gitignore` to protect sensitive data
- ✅ This CHANGELOG file

### Fixed
- 🐛 **Backend validation**: Added Pydantic validators for form data
  - Validate non-empty name, class, school
  - Validate exactly 50 answers in range 1-5
- 🐛 **Frontend bug**: Fixed undefined `chatSuggest` element reference in chatbot
- 🐛 **Security issue**: Moved hardcoded API key to environment variables
- 🐛 **UX issue**: Updated misleading text about optional 50 questions
- 🐛 **Frontend error handling**: Better error messages for network failures
- 🐛 **Form validation**: Added client-side validation for student info

### Changed
- 🔄 Updated `requirements.txt` with pinned versions for reproducibility
- 🔄 Improved error messages in Vietnamese for better UX
- 🔄 API URL detection now works for localhost, development, and production

### Improved
- 📈 Better error handling and validation throughout the stack
- 📈 Added pydantic-settings for better configuration management
- 📈 Docker containerization for easy deployment
- 📈 Production-ready CORS and security configurations

## [1.0.0] - 2024

### Initial Release
- Core RIASEC test with 50 questions
- Frontend interface (index.html)
- Advanced UI with tabs and progress tracking (index1.html)
- FastAPI backend for processing
- Integration with Dify AI chatbot
- LocalStorage-based data persistence
- Dashboard and statistics
