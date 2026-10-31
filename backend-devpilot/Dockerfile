FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /workspace
COPY pom.xml pom.xml
COPY src src

RUN log=/tmp/maven-build.log; \
    for attempt in 1 2 3; do \
      mvn -B -Dmaven.wagon.http.retryHandler.count=3 -f pom.xml -DskipTests package > "$log" 2>&1; \
      status=$?; \
      cat "$log"; \
      if [ "$status" -eq 0 ]; then exit 0; fi; \
      if ! grep -Eiq 'status code: 429|too many requests' "$log" || [ "$attempt" -eq 3 ]; then \
        exit "$status"; \
      fi; \
      delay=$((attempt * 20)); \
      echo "Maven Central returned HTTP 429; retrying in ${delay}s (attempt $((attempt + 1))/3)."; \
      sleep "$delay"; \
    done

FROM eclipse-temurin:21-jre

WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --create-home app
COPY --from=build --chown=app:app /workspace/target/backend-0.0.1-SNAPSHOT.jar /app/app.jar

USER app
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar /app/app.jar"]
