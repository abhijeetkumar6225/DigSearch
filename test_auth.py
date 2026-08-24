import streamlit as st

st.set_page_config(
    page_title="DigSearch",
    page_icon="🔎",
)

st.title("🔎 DigSearch")

if not st.user.is_logged_in:
    st.write("Please sign in to continue.")

    if st.button("🔐 Continue with Google"):
        st.login()

    st.stop()

st.success("Authentication successful!")

st.write("User information:")
st.write(st.user)

if st.button("Logout"):
    st.logout()
st.markdown(f"Welcome! {st.user.name}")

