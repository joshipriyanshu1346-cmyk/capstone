import * as  k8api from '@kubernetes/client-node';

const kc = new k8api.KubeConfig();

try {
  kc.loadFromDefault();
  console.log('Kubernetes config loaded successfully');
} catch (error) {
  console.warn('Warning: Could not load Kubernetes config from default:', error.message);
  console.log('Continuing with default in-cluster config...');
}

export const k8scoreapi = kc.makeApiClient(k8api.CoreV1Api);

console.log('CoreV1Api initialized:', typeof k8scoreapi);
console.log('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(k8scoreapi)).slice(0, 10));

//it is used to interact with the Kubernetes API server, allowing you to perform operations
//  such as creating, reading, updating, and deleting Kubernetes resources like pods, services, and namespaces.

