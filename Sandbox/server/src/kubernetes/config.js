import * as k8api from '@kubernetes/client-node';

let k8scoreapi = null;
let kubernetesInitError = null;

function initializeKubernetesClient() {
  const kc = new k8api.KubeConfig();

  try {
    kc.loadFromDefault();
    console.log('Kubernetes config loaded successfully');
  } catch (error) {
    console.warn('Warning: Could not load Kubernetes config from default:', error.message);
  }

  if (!kc.getCurrentCluster()?.server) {
    try {
      kc.loadFromCluster();
      console.log('Loaded Kubernetes in-cluster config');
    } catch (clusterError) {
      console.warn('Warning: Could not load in-cluster config:', clusterError.message);
    }
  }

  const currentCluster = kc.getCurrentCluster();
  if (!currentCluster?.server) {
    kubernetesInitError = new Error(
      'Kubernetes cluster is not configured. Set up kubeconfig or run the server inside a Kubernetes cluster.'
    );
    console.warn(kubernetesInitError.message);
    return null;
  }

  return kc.makeApiClient(k8api.CoreV1Api);
}

k8scoreapi = initializeKubernetesClient();

export function getK8sApi() {
  if (!k8scoreapi) {
    throw kubernetesInitError || new Error('Kubernetes client is unavailable.');
  }
  return k8scoreapi;
}

export function isKubernetesAvailable() {
  return Boolean(k8scoreapi);
}

export function normalizeKubernetesError(error) {
  if (!error) {
    return new Error('Kubernetes request failed.');
  }

  const message = error.message || String(error);

  if (/ECONNREFUSED|ENOTFOUND|socket hang up|connect/i.test(message)) {
    return new Error('Kubernetes cluster is unreachable. Start your cluster or fix your kubeconfig before creating a sandbox.');
  }

  if (/forbidden|unauthorized|401|403/i.test(message)) {
    return new Error('Kubernetes access is denied. Check RBAC permissions and credentials.');
  }

  return error;
}

