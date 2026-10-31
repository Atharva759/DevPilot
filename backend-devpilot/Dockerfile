FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml pom.xml
COPY src src

RUN mvn -B -f pom.xml -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --create-home app
COPY --from=build --chown=app:app /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar

USER app
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
