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

	environment {
	  BRIDGE_HOST = credentials('e2e-bridge-lib-test-host')
	  BRIDGE_CREDS = credentials('e2e-bridge-lib-test-credentials')
	}

	stages {
		stage('install') {
			steps {
				sh 'npm install'
			}
		}
		stage('test') {
			steps {
				sh 'BRIDGE_USER=$BRIDGE_CREDS_USR BRIDGE_PW=$BRIDGE_CREDS_USR npm run test:integration-with-coverage -- --junitreport --filePrefix=unit-test-results || true'
				sh 'npm run coverage:cobertura'
				junit 'unit-test-results.xml'
				step([$class: 'CoberturaPublisher', coberturaReportFile: 'coverage/cobertura-coverage.xml'])
			}
		}
	}
}
