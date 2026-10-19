import 'package:flutter/material.dart';

import '../services/api_service.dart';

/// Halaman masuk — POST /login ke backend Node.js lokal.
class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.api, required this.onLoggedIn});

  final ApiService api;
  final VoidCallback onLoggedIn;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _usernameCtrl = TextEditingController(text: 'admin');
  final _passwordCtrl = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.api.login(
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text,
      );
      if (!mounted) return;
      setState(() => _busy = false);
      widget.onLoggedIn();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        'GARAP',
                        textAlign: TextAlign.center,
                        style: Theme.of(context)
                            .textTheme
                            .headlineSmall
                            ?.copyWith(
                              fontWeight: FontWeight.w700,
                              color: scheme.primary,
                              letterSpacing: 1.2,
                            ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Monitoring greenhouse hidroponik',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 24),
                      TextFormField(
                        controller: _usernameCtrl,
                        autofillHints: const [AutofillHints.username],
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: 'Nama pengguna',
                          prefixIcon: Icon(Icons.person_outline),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.trim().length < 3)
                            ? 'Nama pengguna minimal 3 karakter.'
                            : null,
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _passwordCtrl,
                        obscureText: true,
                        autofillHints: const [AutofillHints.password],
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _submit(),
                        decoration: const InputDecoration(
                          labelText: 'Kata sandi',
                          prefixIcon: Icon(Icons.lock_outline),
                          border: OutlineInputBorder(),
                        ),
                        validator: (v) => (v == null || v.length < 3)
                            ? 'Kata sandi minimal 3 karakter.'
                            : null,
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context)
                                .colorScheme
                                .errorContainer,
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline,
                                  size: 18,
                                  color: Theme.of(context)
                                      .colorScheme
                                      .onErrorContainer),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _error!,
                                  style: TextStyle(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onErrorContainer),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 20),
                      FilledButton(
                        onPressed: _busy ? null : _submit,
                        child: _busy
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child:
                                    CircularProgressIndicator(strokeWidth: 2),
                              )
                            : const Text('Masuk'),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Backend: 127.0.0.1:8000',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
