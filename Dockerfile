# Build stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
COPY backend/pom.xml .
RUN mvn dependency:go-offline -B
COPY backend/src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Create a non-root user with UID 1000 required by Hugging Face Spaces
RUN adduser -D -u 1000 appuser && chown -R appuser /app
COPY --from=build --chown=appuser:appuser /app/target/water-distribution-backend-1.0.0.jar app.jar

USER appuser

EXPOSE 7860
ENV PORT=7860
ENV SPRING_PROFILES_ACTIVE=supabase
ENV SPRING_DATASOURCE_URL=jdbc:postgresql://db.sblbjcccxwffdhbcisoi.supabase.co:5432/postgres?sslmode=require
ENV SPRING_DATASOURCE_USERNAME=postgres
ENV SPRING_DATASOURCE_PASSWORD=351264.aAbc

ENTRYPOINT ["java", "-jar", "app.jar", "--server.port=7860"]
