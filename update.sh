#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/update.log"
BACKUP_DIR="${SCRIPT_DIR}/.backup"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    log "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
}

error_exit() {
    log_error "$1"
    log_error "Update failed. Starting rollback process..."
    rollback
    exit 1
}

check_command() {
    if ! command -v "$1" &> /dev/null; then
        return 1
    fi
    return 0
}

install_git() {
    log_info "Installing Git..."
    case "$OSTYPE" in
        linux-gnu*)
            if command -v apt-get &> /dev/null; then
                sudo apt-get update && sudo apt-get install -y git
            elif command -v yum &> /dev/null; then
                sudo yum install -y git
            elif command -v pacman &> /dev/null; then
                sudo pacman -S --noconfirm git
            else
                error_exit "Cannot auto-install Git. Please install manually."
            fi
            ;;
        darwin*)
            if command -v brew &> /dev/null; then
                brew install git
            else
                error_exit "Please install Homebrew first, then run: brew install git"
            fi
            ;;
        *)
            error_exit "Unsupported OS. Please install Git manually."
            ;;
    esac
}

install_docker() {
    log_info "Installing Docker..."
    case "$OSTYPE" in
        linux-gnu*)
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker "$USER"
            rm get-docker.sh
            log_warn "Please log out and back in to use Docker without sudo"
            ;;
        darwin*)
            error_exit "Please install Docker Desktop for Mac manually from https://docker.com/products/docker-desktop"
            ;;
        *)
            error_exit "Unsupported OS. Please install Docker manually."
            ;;
    esac
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    local missing_deps=()
    
    if ! check_command git; then
        missing_deps+=("git")
    else
        log_success "Git found: $(git --version)"
    fi
    
    if ! check_command docker; then
        missing_deps+=("docker")
    else
        log_success "Docker found: $(docker --version)"
    fi
    
    if ! docker compose version &> /dev/null; then
        missing_deps+=("docker-compose")
    else
        log_success "Docker Compose found: $(docker compose version)"
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_warn "Missing dependencies: ${missing_deps[*]}"
        read -p "Do you want to auto-install missing dependencies? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            for dep in "${missing_deps[@]}"; do
                case $dep in
                    git) install_git ;;
                    docker) install_docker ;;
                    docker-compose) log_info "Docker Compose is included with Docker" ;;
                esac
            done
        else
            error_exit "Please install missing dependencies manually and try again."
        fi
    fi
}

handle_git_conflicts() {
    log_info "Checking for Git conflicts..."
    
    if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git ls-files --others --exclude-standard)" ]; then
        log_warn "Found local changes or untracked files"
        
        local backup_timestamp
        backup_timestamp=$(date +"%Y%m%d_%H%M%S")
        local git_backup_dir="${BACKUP_DIR}/git_backup_${backup_timestamp}"
        
        mkdir -p "$git_backup_dir"
        
        if [ ! -f ".gitignore" ] || ! grep -q "^\.backup/$" .gitignore 2>/dev/null; then
            echo ".backup/" >> .gitignore
            log_info "Added .backup/ to .gitignore"
        fi
        
        if ! git diff --quiet; then
            log_info "Backing up modified files..."
            git diff > "${git_backup_dir}/working_changes.patch"
        fi
        
        if ! git diff --cached --quiet; then
            log_info "Backing up staged changes..."
            git diff --cached > "${git_backup_dir}/staged_changes.patch"
        fi
        
        local untracked_files
        untracked_files=$(git ls-files --others --exclude-standard)
        if [ -n "$untracked_files" ]; then
            log_info "Backing up untracked files..."
            echo "$untracked_files" > "${git_backup_dir}/untracked_files.list"
            
            while IFS= read -r file; do
                if [ -f "$file" ]; then
                    local backup_file_dir
                    backup_file_dir=$(dirname "${git_backup_dir}/${file}")
                    mkdir -p "$backup_file_dir"
                    cp "$file" "${git_backup_dir}/${file}"
                fi
            done <<< "$untracked_files"
        fi
        
        echo "$backup_timestamp" > "${BACKUP_DIR}/latest_git_backup.txt"
        
        log_info "Resetting to clean state for update..."
        git reset --hard HEAD 2>/dev/null || true
        git clean -fd 2>/dev/null || true
        
        log_success "Local changes backed up to: $git_backup_dir"
    else
        log_info "No local changes detected"
    fi
}

restore_git_changes() {
    if [ ! -f "${BACKUP_DIR}/latest_git_backup.txt" ]; then
        return 0
    fi
    
    local backup_timestamp
    if ! backup_timestamp=$(cat "${BACKUP_DIR}/latest_git_backup.txt" 2>/dev/null) || [ -z "$backup_timestamp" ]; then
        log_warn "Could not read git backup timestamp"
        return 0
    fi
    
    local git_backup_dir="${BACKUP_DIR}/git_backup_${backup_timestamp}"
    
    if [ ! -d "$git_backup_dir" ]; then
        log_warn "Git backup directory not found: $git_backup_dir"
        return 0
    fi
    
    log_info "Found backed up local changes"
    read -p "Do you want to restore your local changes? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "Restoring local changes..."
        
        if [ -f "${git_backup_dir}/untracked_files.list" ]; then
            while IFS= read -r file; do
                if [ -f "${git_backup_dir}/${file}" ]; then
                    local restore_dir
                    restore_dir=$(dirname "$file")
                    mkdir -p "$restore_dir"
                    cp "${git_backup_dir}/${file}" "$file"
                    log_info "Restored: $file"
                fi
            done < "${git_backup_dir}/untracked_files.list"
        fi
        
        if [ -f "${git_backup_dir}/working_changes.patch" ]; then
            if git apply "${git_backup_dir}/working_changes.patch" 2>/dev/null; then
                log_success "Applied working changes"
            else
                log_warn "Could not apply working changes automatically. Patch saved at: ${git_backup_dir}/working_changes.patch"
            fi
        fi
        
        if [ -f "${git_backup_dir}/staged_changes.patch" ]; then
            if git apply --cached "${git_backup_dir}/staged_changes.patch" 2>/dev/null; then
                log_success "Applied staged changes"
            else
                log_warn "Could not apply staged changes automatically. Patch saved at: ${git_backup_dir}/staged_changes.patch"
            fi
        fi
        
        log_success "Local changes restoration completed"
    else
        log_info "Local changes not restored. Backup preserved at: $git_backup_dir"
    fi
}

create_backup() {
    log_info "Creating backup..."
    
    mkdir -p "$BACKUP_DIR"
    local backup_timestamp
    backup_timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_path="${BACKUP_DIR}/backup_${backup_timestamp}"
    
    if git rev-parse HEAD &> /dev/null; then
        git rev-parse HEAD > "${backup_path}_commit.txt"
        log_info "Current commit saved: $(cat "${backup_path}_commit.txt")"
    fi
    
    cp docker-compose.yml "${backup_path}_docker-compose.yml" 2>/dev/null || true
    cp .env "${backup_path}_env" 2>/dev/null || true
    
    echo "$backup_timestamp" > "${BACKUP_DIR}/latest_backup.txt"
    log_success "Backup created: $backup_path"
}

rollback() {
    log_info "Starting rollback process..."
    
    if [ ! -f "${BACKUP_DIR}/latest_backup.txt" ]; then
        log_error "No backup found. Cannot rollback."
        return 1
    fi
    
    local backup_timestamp
    backup_timestamp=$(cat "${BACKUP_DIR}/latest_backup.txt")
    local backup_path="${BACKUP_DIR}/backup_${backup_timestamp}"
    
    docker compose down 2>/dev/null || true
    
    if [ -f "${backup_path}_commit.txt" ]; then
        local previous_commit
        previous_commit=$(cat "${backup_path}_commit.txt")
        log_info "Rolling back to commit: $previous_commit"
        git checkout "$previous_commit" || log_warn "Failed to rollback git state"
    fi
    
    [ -f "${backup_path}_docker-compose.yml" ] && cp "${backup_path}_docker-compose.yml" docker-compose.yml
    [ -f "${backup_path}_env" ] && cp "${backup_path}_env" .env
    
    docker compose up -d 2>/dev/null || log_warn "Failed to restart containers"
    
    log_success "Rollback completed"
}

main() {
    log_info "Starting GML Custom News service (by niobrix.ru) update process"
    
    if [ ! -f "docker-compose.yml" ]; then
        error_exit "docker-compose.yml not found. Please run this script from the project root directory."
    fi
    
    check_dependencies
    create_backup
    
    log_info "Stopping current containers..."
    docker compose down || error_exit "Failed to stop containers"
    
    handle_git_conflicts
    
    log_info "Pulling latest changes from repository..."
    if ! git pull; then
        log_error "Failed to pull changes from repository"
        restore_git_changes
        error_exit "Git pull failed"
    fi
    
    restore_git_changes
    
    log_info "Building and starting updated containers..."
    docker compose up -d --build || error_exit "Failed to build and start containers"
    
    log_info "Checking service status..."
    docker compose ps
    
    local running_containers
    running_containers=$(docker compose ps --services --filter "status=running" | wc -l)
    local total_services
    total_services=$(docker compose ps --services | wc -l)
    
    if [ "$running_containers" -eq "$total_services" ]; then
        log_success "All services are running successfully!"
    else
        log_warn "Some services may not be running properly. Check logs."
    fi
    
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "backup_*" -type f | sort -r | tail -n +11 | xargs rm -f 2>/dev/null || true
        find "$BACKUP_DIR" -name "git_backup_*" -type d | sort -r | tail -n +6 | xargs rm -rf 2>/dev/null || true
    fi
    
    log_success "Update completed successfully!"
    log_info "You can check the logs with: docker compose logs -f"
    log_info "If there are issues, run: ./update.sh rollback"
}

case "${1:-}" in
    rollback)
        log_info "Manual rollback requested"
        rollback
        ;;
    *)
        main
        ;;
esac