allprojects {
    repositories {
        google()
        mavenCentral()
    }
    
    // Nonaktifkan check AAR metadata untuk semua project
    tasks.configureEach {
        if (name.contains("CheckAarMetadata", ignoreCase = true)) {
            enabled = false
        }
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
    
    // Nonaktifkan check AAR metadata untuk semua subproject
    afterEvaluate {
        tasks.matching { it.name.contains("CheckAarMetadata", ignoreCase = true) }.configureEach {
            enabled = false
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}


tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
