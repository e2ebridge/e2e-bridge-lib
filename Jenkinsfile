#!groovy

pipeline {
	agent {
		label 'cscabbia'
	}

	options {
		buildDiscarder(logRotator(numToKeepStr: '10'))
		disableConcurrentBuilds()
	}

	tools {
		nodejs 'NodeJS 8.9.1'
	}

	stages {
		stage('install') {
			steps {
				sh 'npm install'
			}
		}
		stage('test') {
			steps {
				sh 'npm test -- --junitreport --filePrefix=unit-test-results'
				junit 'unit-test-results.xml'
			}
		}
	}
}