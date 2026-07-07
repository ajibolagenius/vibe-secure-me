# Container & Docker Security

## Least Privilege and Non-Root Users
- **Never run containers as the root user.** If an attacker manages to break out of the container, running as root makes host compromise much easier.
- Always create a dedicated, unprivileged user and switch to it using the `USER` directive in your Dockerfile.

```dockerfile
# BAD: Runs as root by default
FROM node:18
WORKDIR /app
COPY . .
CMD ["npm", "start"]

# GOOD: Switch to an unprivileged user
FROM node:18
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
WORKDIR /app
COPY . .
RUN chown -R appuser:appgroup /app
USER appuser
CMD ["npm", "start"]
```

## Base Image Vulnerabilities
- Using bloated base images like `node:18` or `ubuntu:latest` introduces hundreds of unnecessary binaries, increasing the attack surface.
- Use minimal base images like `alpine`, `distroless`, or slim variants (e.g., `node:18-alpine`).
- Regularly scan your Docker images for CVEs using tools like Trivy or Docker Scout.

## Sensitive Host Volumes
- Never mount the host's `/var/run/docker.sock` into a container unless strictly necessary (and heavily isolated). It grants the container full root access to the host machine.
- Avoid mounting host file systems (`/etc`, `/bin`) into containers.

## Exposed Ports
- Do not blindly map container ports to all interfaces on the host (e.g., `0.0.0.0:6379:6379`). If your Redis database is meant to be accessed only by other containers, do not publish its port to the host network.
