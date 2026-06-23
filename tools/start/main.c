#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <unistd.h>

#define BUFFER_SIZE 4096

int file_exists(const char *filename) {
    struct stat buffer;
    return stat(filename, &buffer) == 0;
}

int has_file_extension(const char *extension) {
    DIR *d = opendir(".");
    if (!d) {
        return 0;
    }

    struct dirent *dir;
    int found = 0;
    size_t ext_len = strlen(extension);

    while ((dir = readdir(d)) != NULL) {
        size_t name_len = strlen(dir->d_name);
        if (name_len > ext_len &&
            strcmp(dir->d_name + name_len - ext_len, extension) == 0) {
            found = 1;
            break;
        }
    }

    closedir(d);
    return found;
}

// Returns 1 for start, 2 for dev, 0 when neither exists, -1 on read failure.
int npm_script(void) {
    FILE *file = fopen("package.json", "r");
    if (!file) {
        return -1;
    }

    char line[BUFFER_SIZE];
    int in_scripts = 0;
    int has_start = 0;
    int has_dev = 0;

    while (fgets(line, sizeof(line), file)) {
        if (strstr(line, "\"scripts\"")) {
            in_scripts = 1;
            continue;
        }

        if (in_scripts) {
            if (strstr(line, "}") && !strstr(line, ":")) {
                in_scripts = 0;
            }
            if (strstr(line, "\"start\"")) {
                has_start = 1;
            }
            if (strstr(line, "\"dev\"")) {
                has_dev = 1;
            }
        }
    }

    fclose(file);

    if (has_start) {
        return 1;
    }
    if (has_dev) {
        return 2;
    }
    return 0;
}

int main(void) {
    char *cmd = NULL;
    char *args[4] = {NULL};

    if (file_exists("package.json")) {
        int script = npm_script();
        if (script == 1 || script == -1) {
            cmd = "npm";
            args[0] = "npm";
            args[1] = "run";
            args[2] = "start";
            args[3] = NULL;
        } else if (script == 2) {
            cmd = "npm";
            args[0] = "npm";
            args[1] = "run";
            args[2] = "dev";
            args[3] = NULL;
        }
    }

    if (!cmd && file_exists("go.mod")) {
        cmd = "go";
        args[0] = "go";
        args[1] = "run";
        args[2] = ".";
        args[3] = NULL;
    } else if (!cmd && has_file_extension(".csproj")) {
        cmd = "dotnet";
        args[0] = "dotnet";
        args[1] = "run";
        args[2] = NULL;
    }

    if (!cmd) {
        fprintf(
            stderr,
            "Error: No recognized project files (package.json, go.mod, .csproj) found.\n"
        );
        return 0;
    }

    setenv("BROWSER", "none", 1);
    setenv("FORCE_COLOR", "1", 1);
    setenv("COLORTERM", "truecolor", 1);
    setenv("DOTNET_SYSTEM_CONSOLE_ALLOW_ANSI_COLOR_REDIRECTION", "1", 1);
    setenv("DOTNET_LOGGING__CONSOLE__DISABLETOCOLORS", "false", 1);

    execvp(cmd, args);

    perror("Error executing command");
    return 1;
}
