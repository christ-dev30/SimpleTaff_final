# ============================================================
#   SimpleTaff — Dockerfile multi-stage
#   Stage 1: Build avec Maven
#   Stage 2: Image runtime minimale JRE 21
# ============================================================

# ── STAGE 1: Build ──────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /build

# Copier le POM en premier (cache des dépendances Maven)
COPY pom.xml .

# Télécharger les dépendances sans compiler le code (cache layer)
RUN apk add --no-cache maven 2>/dev/null || \
    (apk add --no-cache wget && \
     wget -q https://downloads.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.tar.gz && \
     tar -xzf apache-maven-3.9.6-bin.tar.gz -C /opt && \
     ln -s /opt/apache-maven-3.9.6/bin/mvn /usr/local/bin/mvn)

# Pré-télécharger les dépendances
RUN mvn dependency:go-offline -q 2>/dev/null || true

# Copier les sources
COPY src ./src

# Build sans tests
RUN mvn package -DskipTests -q

# ── STAGE 2: Runtime ─────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine AS runtime

# Métadonnées
LABEL maintainer="SimpleTaff Team"
LABEL description="SimpleTaff - Plateforme SaaS de gestion de main-d'oeuvre"
LABEL version="1.0.0"

# Utilisateur non-root pour la sécurité
RUN addgroup -S simpletaff && adduser -S simpletaff -G simpletaff

WORKDIR /app

# Copier le JAR depuis le stage builder
COPY --from=builder /build/target/*.jar app.jar

# Dossier pour les uploads (photos, documents)
RUN mkdir -p /app/uploads && chown -R simpletaff:simpletaff /app

# Utiliser l'utilisateur non-root
USER simpletaff

# Port exposé
EXPOSE 8080

# Variables d'env par défaut (surchargées par .env ou docker-compose)
ENV PORT=8080 \
    MYSQLHOST=94.130.65.236 \
    MYSQLPORT=3306 \
    MYSQLDATABASE=ehuicp_simpletaff \
    MYSQLUSER=ehuicp \
    JWT_EXPIRATION_MS=86400000 \
    JWT_REFRESH_EXPIRATION_MS=604800000 \
    MAIL_HOST=smtp-relay.brevo.com \
    MAIL_PORT=587 \
    MAX_FILE_SIZE=30MB \
    MAX_REQUEST_SIZE=30MB \
    JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

# Lancer l'application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
