/**
 * Minimal Navigo Router (v8 compatible)
 * Simplified for workbench use - hash-based routing only
 */

export default class Navigo {
  constructor(root, options = {}) {
    this.root = root || '/';
    this.useHash = options.hash !== undefined ? options.hash : true;
    this.routes = [];
    this.notFoundHandler = null;
    this.current = null;
  }

  on(route, handler) {
    if (route instanceof RegExp) {
      this.routes.push({ pattern: route, handler, isRegex: true });
    } else {
      // Convert route pattern to regex
      const pattern = this._routeToRegex(route);
      const paramNames = this._extractParamNames(route);
      this.routes.push({ pattern, handler, paramNames, route });
    }
    return this;
  }

  notFound(handler) {
    this.notFoundHandler = handler;
    return this;
  }

  navigate(path) {
    if (this.useHash) {
      window.location.hash = path;
    } else {
      window.history.pushState({}, '', this.root + path);
      this.resolve();
    }
  }

  resolve() {
    const path = this._getCurrentPath();
    this.current = path;
    
    // Try to match routes
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        const data = {};
        if (route.paramNames) {
          route.paramNames.forEach((name, i) => {
            data[name] = match[i + 1];
          });
        }
        route.handler({ data, params: data });
        return;
      }
    }

    // No route matched
    if (this.notFoundHandler) {
      this.notFoundHandler();
    }
  }

  getCurrentLocation() {
    return {
      url: this._getCurrentPath(),
      route: this.current
    };
  }

  _getCurrentPath() {
    if (this.useHash) {
      const hash = window.location.hash;
      return hash.slice(1) || '/'; // Remove #
    } else {
      return window.location.pathname.replace(this.root, '') || '/';
    }
  }

  _routeToRegex(route) {
    if (route === '/') {
      return /^\/$/;
    }
    
    // Replace :param with capture groups
    const pattern = route
      .replace(/\//g, '\\/')
      .replace(/:([^\/]+)/g, '([^/]+)');
    
    return new RegExp(`^${pattern}$`);
  }

  _extractParamNames(route) {
    const matches = route.match(/:([^\/]+)/g);
    if (!matches) return [];
    return matches.map(m => m.slice(1)); // Remove :
  }
}

// Auto-resolve on hash change
if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    // Router will resolve itself
  });
}
